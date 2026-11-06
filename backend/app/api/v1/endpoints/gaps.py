"""Research gaps endpoint – IBM Granite analysis."""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.granite_service import granite_service
from app.services.cloudant_service import cloudant_service

router = APIRouter()


class GapAnalysisRequest(BaseModel):
    topic: str
    papers: list[dict]
    user_id: str = "demo-user"
    save: bool = True


@router.post("/analyze")
async def analyze_gaps(req: GapAnalysisRequest):
    """Identify research gaps using IBM Granite based on provided papers."""
    if not req.papers:
        raise HTTPException(status_code=400, detail="At least one paper is required")
    if len(req.papers) > 20:
        req.papers = req.papers[:20]

    try:
        result = await granite_service.identify_research_gaps(req.papers, req.topic)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI analysis error: {str(exc)}")

    response = {
        "topic": req.topic,
        "paper_count": len(req.papers),
        "gaps": result["gaps"],
        "ai_generated": True,
        "disclaimer": (
            "These research gaps are AI-generated suggestions based on the provided papers. "
            "Always validate with domain experts before conducting research."
        ),
    }

    return response


@router.post("/from-search")
async def analyze_gaps_from_query(body: dict):
    """Search for papers and immediately analyze gaps."""
    from app.services.search_service import search_all

    topic = body.get("topic", "")
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    # Search for papers first
    papers = await search_all(query=topic, limit_per_source=10)

    if not papers:
        raise HTTPException(status_code=404, detail="No papers found for this topic")

    result = await granite_service.identify_research_gaps(papers, topic)

    return {
        "topic": topic,
        "papers_analyzed": papers[:10],
        "paper_count": len(papers),
        "gaps": result["gaps"],
        "ai_generated": True,
    }
