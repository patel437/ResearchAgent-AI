"""
Academic literature search service.

Aggregates results from:
  - OpenAlex (open scholarly graph)
  - arXiv (preprints)
  - Crossref (DOI metadata)
"""
import asyncio
import logging
import re
import xml.etree.ElementTree as ET
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENALEX_BASE = "https://api.openalex.org"
HEADERS = {"User-Agent": f"ResearchAgentAI/1.0 (mailto:{settings.OPENALEX_EMAIL})"}


# ── Normalizers ───────────────────────────────────────────────

def _clean_abstract(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()[:1000]


def _extract_openalex_abstract(inverted_index: Optional[dict]) -> str:
    """Reconstruct abstract from OpenAlex inverted index format."""
    if not inverted_index:
        return ""
    words: dict[int, str] = {}
    for word, positions in inverted_index.items():
        for pos in positions:
            words[pos] = word
    return " ".join(words[i] for i in sorted(words))[:1000]


def _normalize_openalex(work: dict) -> dict:
    authors = [
        a.get("author", {}).get("display_name", "Unknown")
        for a in work.get("authorships", [])[:6]
    ]
    abstract = _extract_openalex_abstract(work.get("abstract_inverted_index"))
    doi = work.get("doi", "")
    if doi:
        doi = doi.replace("https://doi.org/", "")
    return {
        "id": work.get("id", ""),
        "title": work.get("display_name", "Untitled"),
        "authors": authors,
        "abstract": abstract,
        "year": work.get("publication_year"),
        "doi": doi,
        "source_url": work.get("primary_location", {}).get("landing_page_url") or work.get("doi", ""),
        "source": "OpenAlex",
        "cited_by": work.get("cited_by_count", 0),
        "domain": work.get("primary_topic", {}).get("field", {}).get("display_name", ""),
    }


def _normalize_arxiv(entry: ET.Element, ns: str) -> dict:
    def tag(name):
        return f"{{{ns}}}{name}"

    title = (entry.findtext(tag("title")) or "").strip()
    abstract = (entry.findtext(tag("summary")) or "").strip()[:1000]
    authors = [
        a.findtext(tag("name")) or ""
        for a in entry.findall(tag("author"))[:6]
    ]
    doi_el = entry.find("{http://arxiv.org/schemas/atom}doi")
    doi = doi_el.text.strip() if doi_el is not None and doi_el.text else ""
    link = ""
    for link_el in entry.findall(tag("link")):
        if link_el.get("type") == "text/html":
            link = link_el.get("href", "")
            break
    published = entry.findtext(tag("published"), "")
    year = int(published[:4]) if published else None
    return {
        "id": entry.findtext(tag("id"), ""),
        "title": title,
        "authors": authors,
        "abstract": abstract,
        "year": year,
        "doi": doi,
        "source_url": link,
        "source": "arXiv",
        "cited_by": 0,
        "domain": "Computer Science / Physics / Mathematics",
    }


def _normalize_crossref(item: dict) -> dict:
    title = (item.get("title") or ["Untitled"])[0]
    authors = [
        f"{a.get('given', '')} {a.get('family', '')}".strip()
        for a in item.get("author", [])[:6]
    ]
    year = None
    date_parts = item.get("published-print", item.get("published-online", {})).get("date-parts", [[]])
    if date_parts and date_parts[0]:
        year = date_parts[0][0]
    abstract = _clean_abstract(item.get("abstract", ""))
    doi = item.get("DOI", "")
    return {
        "id": f"crossref-{doi}",
        "title": title,
        "authors": authors,
        "abstract": abstract,
        "year": year,
        "doi": doi,
        "source_url": item.get("URL", f"https://doi.org/{doi}"),
        "source": "Crossref",
        "cited_by": item.get("is-referenced-by-count", 0),
        "domain": ", ".join(item.get("subject", [])[:3]),
    }


# ── Search functions ──────────────────────────────────────────

async def search_openalex(query: str, year_from: Optional[int], year_to: Optional[int], limit: int = 15) -> list[dict]:
    params = {
        "search": query,
        "per-page": limit,
        "sort": "relevance_score:desc",
        "select": "id,display_name,authorships,abstract_inverted_index,publication_year,doi,primary_location,cited_by_count,primary_topic",
    }
    if year_from:
        params["filter"] = f"publication_year:>{year_from - 1}"
    if year_to:
        filt = params.get("filter", "")
        params["filter"] = f"{filt},publication_year:<{year_to + 1}" if filt else f"publication_year:<{year_to + 1}"

    async with httpx.AsyncClient(timeout=20, headers=HEADERS) as client:
        resp = await client.get(f"{OPENALEX_BASE}/works", params=params)
        if resp.status_code != 200:
            return []
        data = resp.json()
        return [_normalize_openalex(w) for w in data.get("results", [])]


async def search_arxiv(query: str, year_from: Optional[int], limit: int = 10) -> list[dict]:
    params = {
        "search_query": f"all:{query}",
        "max_results": limit,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(settings.ARXIV_BASE_URL, params=params)
        if resp.status_code != 200:
            return []
    ns = "http://www.w3.org/2005/Atom"
    root = ET.fromstring(resp.text)
    results = []
    for entry in root.findall(f"{{{ns}}}entry"):
        paper = _normalize_arxiv(entry, ns)
        if year_from and paper.get("year") and paper["year"] < year_from:
            continue
        results.append(paper)
    return results


async def search_crossref(query: str, year_from: Optional[int], year_to: Optional[int], limit: int = 10) -> list[dict]:
    params = {
        "query": query,
        "rows": limit,
        "sort": "relevance",
        "select": "title,author,abstract,DOI,URL,published-print,published-online,is-referenced-by-count,subject",
    }
    if year_from:
        params["filter"] = f"from-pub-date:{year_from}"
    if year_to:
        filt = params.get("filter", "")
        params["filter"] = f"{filt},until-pub-date:{year_to}" if filt else f"until-pub-date:{year_to}"

    async with httpx.AsyncClient(timeout=20, headers=HEADERS) as client:
        resp = await client.get(settings.CROSSREF_BASE_URL, params=params)
        if resp.status_code != 200:
            return []
        data = resp.json()
        items = data.get("message", {}).get("items", [])
        return [_normalize_crossref(i) for i in items]


async def search_all(
    query: str,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    domain: Optional[str] = None,
    limit_per_source: int = 12,
) -> list[dict]:
    """Search all sources in parallel and merge results."""
    tasks = [
        search_openalex(query, year_from, year_to, limit_per_source),
        search_arxiv(query, year_from, limit_per_source // 2),
        search_crossref(query, year_from, year_to, limit_per_source // 2),
    ]
    results_per_source = await asyncio.gather(*tasks, return_exceptions=True)

    merged: list[dict] = []
    seen_titles: set[str] = set()

    for source_results in results_per_source:
        if isinstance(source_results, Exception):
            logger.warning("Search source error: %s", source_results)
            continue
        for paper in source_results:
            title_key = paper.get("title", "").lower()[:60]
            if title_key not in seen_titles and paper.get("title"):
                seen_titles.add(title_key)
                merged.append(paper)

    # Filter by domain if provided
    if domain:
        domain_lower = domain.lower()
        domain_filtered = [p for p in merged if domain_lower in (p.get("domain") or "").lower()]
        if domain_filtered:
            merged = domain_filtered

    # Sort by citation count descending, keeping original relevance for uncited
    merged.sort(key=lambda p: p.get("cited_by", 0), reverse=True)
    return merged
