"""Reference manager endpoint – citation generation and management."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.services.citation_service import generate_all_citations, generate_bibtex
from app.services.cloudant_service import cloudant_service

router = APIRouter()


class SaveReferenceRequest(BaseModel):
    user_id: str = "demo-user"
    paper: dict


class GenerateCitationsRequest(BaseModel):
    papers: list[dict]
    format: str = "all"  # "apa" | "mla" | "ieee" | "bibtex" | "all"


@router.post("/save")
async def save_reference(req: SaveReferenceRequest):
    """Save a paper as a reference in Cloudant."""
    try:
        saved = cloudant_service.save_reference(req.user_id, req.paper)
        return {"success": True, "reference": saved}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("")
async def get_references(user_id: str = Query(default="demo-user")):
    """Get all references for a user."""
    refs = cloudant_service.get_references(user_id)
    # Enrich with citations
    enriched = []
    for i, ref in enumerate(refs):
        citations = generate_all_citations(ref, i + 1)
        enriched.append({**ref, "citations": citations})
    return {"references": enriched, "total": len(enriched)}


@router.delete("/{ref_id}")
async def delete_reference(ref_id: str, rev: str = Query(...), user_id: str = Query(default="demo-user")):
    """Delete a reference."""
    success = cloudant_service.delete_reference(ref_id, rev)
    return {"success": success}


@router.post("/citations")
async def generate_citations(req: GenerateCitationsRequest):
    """Generate citations for a list of papers in all formats."""
    results = []
    for i, paper in enumerate(req.papers):
        citations = generate_all_citations(paper, i + 1)
        results.append({"paper": paper, "citations": citations})
    return {"citations": results, "count": len(results)}


@router.post("/bibtex")
async def export_bibtex(body: dict):
    """Export references as BibTeX."""
    papers = body.get("papers", [])
    bibtex_entries = [generate_bibtex(p) for p in papers]
    combined = "\n\n".join(bibtex_entries)
    return {"bibtex": combined, "count": len(bibtex_entries)}


@router.get("/export")
async def export_references(user_id: str = Query(default="demo-user"), fmt: str = Query(default="bibtex")):
    """Export all user references in the specified format."""
    from fastapi.responses import PlainTextResponse

    refs = cloudant_service.get_references(user_id)
    if fmt == "bibtex":
        entries = [generate_bibtex(r) for r in refs]
        content = "\n\n".join(entries)
        return PlainTextResponse(
            content,
            media_type="application/x-bibtex",
            headers={"Content-Disposition": 'attachment; filename="references.bib"'},
        )
    # Default: return all as JSON
    return {"references": refs, "format": fmt}
