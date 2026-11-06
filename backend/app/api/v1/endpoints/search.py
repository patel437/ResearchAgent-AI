"""Research search endpoint."""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.search_service import search_all
from app.services.granite_service import granite_service
from app.services.cloudant_service import cloudant_service

router = APIRouter()


class SavePaperRequest(BaseModel):
    user_id: str = "demo-user"
    paper: dict
    project_id: Optional[str] = None


@router.get("")
async def search_papers(
    q: str = Query(..., min_length=2, description="Research query"),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    domain: Optional[str] = Query(None),
    enhance: bool = Query(default=True, description="Use IBM Granite to enhance query"),
    user_id: str = Query(default="demo-user"),
):
    """Search academic literature across OpenAlex, arXiv, and Crossref."""
    search_query = q

    # Optionally enhance the query with IBM Granite
    if enhance:
        try:
            understanding = await granite_service.understand_research_query(q)
            # Use suggested search terms for a broader, more targeted search
            suggested = understanding.get("suggested_search_terms", [])
            if suggested:
                search_query = " ".join(suggested[:3])
        except Exception:
            pass  # Fall back to original query

    papers = await search_all(
        query=search_query,
        year_from=year_from,
        year_to=year_to,
        domain=domain,
    )

    return {
        "query": q,
        "enhanced_query": search_query,
        "total": len(papers),
        "papers": papers,
    }


@router.post("/save")
async def save_paper(req: SavePaperRequest):
    """Save a paper to Cloudant for the user."""
    try:
        saved = cloudant_service.save_paper(req.user_id, req.paper, req.project_id)
        return {"success": True, "saved": saved}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/saved")
async def get_saved_papers(user_id: str = Query(default="demo-user")):
    """Get all papers saved by a user."""
    papers = cloudant_service.get_saved_papers(user_id)
    return {"papers": papers, "total": len(papers)}
