"""
Citation formatter service.

Generates APA, MLA, IEEE citations and BibTeX from paper metadata.
"""
import re
from typing import Optional


def _sanitize(text: str) -> str:
    return re.sub(r"[^\w\s\-.,]", "", text or "").strip()


def _split_author(name: str) -> tuple[str, str]:
    """
    Return (last_name, first_initials) from an author string.
    Handles both:
      "Last, First Middle"  →  last="Last", initials="F. M."
      "First Middle Last"   →  last="Last", initials="F. M."
    """
    name = name.strip()
    if "," in name:
        # "Last, First" format
        parts = [p.strip() for p in name.split(",", 1)]
        last = parts[0]
        first = parts[1] if len(parts) > 1 else ""
        initials = " ".join(f"{p[0]}." for p in first.split() if p)
    else:
        # "First Middle Last" format
        parts = name.split()
        if len(parts) >= 2:
            last = parts[-1]
            initials = " ".join(f"{p[0]}." for p in parts[:-1] if p)
        else:
            last = name
            initials = ""
    return last, initials


def _format_authors_apa(authors: list[str]) -> str:
    if not authors:
        return "Unknown Author"
    formatted = []
    for name in authors[:6]:
        last, initials = _split_author(name)
        formatted.append(f"{last}, {initials}" if initials else last)
    if len(authors) > 6:
        return ", ".join(formatted) + ", ... et al."
    elif len(formatted) == 1:
        return formatted[0]
    else:
        return ", ".join(formatted[:-1]) + ", & " + formatted[-1]


def _format_authors_mla(authors: list[str]) -> str:
    if not authors:
        return "Unknown"
    last0, initials0 = _split_author(authors[0])
    first_fmt = f"{last0}, {initials0}" if initials0 else last0
    if len(authors) == 1:
        return first_fmt
    elif len(authors) <= 3:
        rest = ", ".join(n.strip() for n in authors[1:])
        return f"{first_fmt}, and {rest}"
    else:
        return f"{first_fmt}, et al."


def _format_authors_ieee(authors: list[str]) -> str:
    if not authors:
        return "Unknown"
    formatted = []
    for name in authors[:6]:
        last, initials = _split_author(name)
        formatted.append(f"{initials} {last}" if initials else last)
    if len(authors) > 6:
        return ", ".join(formatted) + " et al."
    return ", ".join(formatted)


def _bibtex_key(authors: list[str], year: Optional[int], title: str) -> str:
    first_author = (authors[0].split()[-1] if authors else "unknown").lower()
    first_word = re.sub(r"[^a-z]", "", (title.split()[0] if title else "paper").lower())
    return f"{first_author}{year or 'nd'}{first_word}"


def generate_apa(paper: dict) -> str:
    authors = _format_authors_apa(paper.get("authors", []))
    year = paper.get("year", "n.d.")
    title = paper.get("title", "Untitled")
    doi = paper.get("doi", "")
    journal = paper.get("journal", paper.get("source", ""))
    doi_part = f" https://doi.org/{doi}" if doi else ""
    journal_part = f" *{journal}*." if journal else ""
    return f"{authors} ({year}). {title}.{journal_part}{doi_part}"


def generate_mla(paper: dict) -> str:
    authors = _format_authors_mla(paper.get("authors", []))
    title = paper.get("title", "Untitled")
    journal = paper.get("journal", paper.get("source", ""))
    year = paper.get("year", "n.d.")
    doi = paper.get("doi", "")
    doi_part = f", doi:{doi}" if doi else ""
    journal_part = f" *{journal}*," if journal else ""
    return f'{authors}. "{title}."{journal_part} {year}{doi_part}.'


def generate_ieee(paper: dict, ref_num: int = 1) -> str:
    authors = _format_authors_ieee(paper.get("authors", []))
    title = paper.get("title", "Untitled")
    journal = paper.get("journal", paper.get("source", ""))
    year = paper.get("year", "n.d.")
    doi = paper.get("doi", "")
    doi_part = f", doi: {doi}" if doi else ""
    journal_part = f" *{journal}*," if journal else ""
    return f"[{ref_num}] {authors}, \"{title},\"{journal_part} {year}{doi_part}."


def generate_bibtex(paper: dict) -> str:
    authors = paper.get("authors", [])
    year = paper.get("year")
    title = paper.get("title", "Untitled")
    doi = paper.get("doi", "")
    journal = paper.get("journal", paper.get("source", ""))
    key = _bibtex_key(authors, year, title)
    author_str = " and ".join(authors) if authors else "Unknown"
    lines = [
        f"@article{{{key},",
        f"  author    = {{{author_str}}},",
        f"  title     = {{{title}}},",
        f"  year      = {{{year or 'n.d.'}}},",
    ]
    if journal:
        lines.append(f"  journal   = {{{journal}}},")
    if doi:
        lines.append(f"  doi       = {{{doi}}},")
    lines.append("}")
    return "\n".join(lines)


def generate_all_citations(paper: dict, ref_num: int = 1) -> dict:
    return {
        "apa": generate_apa(paper),
        "mla": generate_mla(paper),
        "ieee": generate_ieee(paper, ref_num),
        "bibtex": generate_bibtex(paper),
    }
