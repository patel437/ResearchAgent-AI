"""Hypothesis generation endpoint – IBM Granite."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.granite_service import granite_service

router = APIRouter()


class HypothesisRequest(BaseModel):
    topic: str
    gaps: str = ""
    papers: list[dict] = []
    user_id: str = "demo-user"


@router.post("/generate")
async def generate_hypotheses(req: HypothesisRequest):
    """Generate research hypotheses using IBM Granite."""
    if not req.topic:
        raise HTTPException(status_code=400, detail="Research topic is required")

    try:
        result = await granite_service.generate_hypotheses(req.topic, req.gaps, req.papers)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI generation error: {str(exc)}")

    return {
        "topic": req.topic,
        "hypotheses": result["hypotheses"],
        "supporting_papers": req.papers[:5],
        "ai_generated": True,
        "disclaimer": (
            "These are AI-generated hypotheses for academic exploration. "
            "Validate with domain experts before conducting research."
        ),
    }


@router.post("/from-gaps")
async def generate_from_gaps(body: dict):
    """Generate hypotheses directly from identified gaps."""
    topic = body.get("topic", "")
    gaps = body.get("gaps", "")
    papers = body.get("papers", [])
    if not topic or not gaps:
        raise HTTPException(status_code=400, detail="Topic and gaps are required")

    result = await granite_service.generate_hypotheses(topic, gaps, papers)
    return {
        "topic": topic,
        "hypotheses": result["hypotheses"],
        "ai_generated": True,
    }
