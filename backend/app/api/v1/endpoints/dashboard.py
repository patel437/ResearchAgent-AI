"""Dashboard stats endpoint."""
from fastapi import APIRouter, Query

from app.services.cloudant_service import cloudant_service
from app.services.local_storage_service import local_storage
from app.core.config import settings

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(user_id: str = Query(default="demo-user")):
    stats = cloudant_service.get_user_stats(user_id)
    storage_stats = local_storage.storage_stats(user_id)
    return {
        **stats,
        "ibm_connected": settings.has_ibm_credentials,
        "cloudant_connected": settings.has_cloudant,
        "demo_mode": settings.is_demo,
        "storage": {
            "backend": "local",
            "path": settings.LOCAL_STORAGE_PATH,
            **storage_stats,
        },
    }


@router.get("/activity")
async def get_recent_activity(user_id: str = Query(default="demo-user")):
    """Return recent activity (papers saved, reports generated, etc.)."""
    papers = cloudant_service.get_saved_papers(user_id)[:5]
    reports = cloudant_service.get_reports(user_id)[:3]
    activity = []
    for p in papers:
        activity.append(
            {
                "type": "paper_saved",
                "title": p.get("title", ""),
                "timestamp": p.get("saved_at", ""),
            }
        )
    for r in reports:
        activity.append(
            {
                "type": "report_generated",
                "title": r.get("topic", ""),
                "timestamp": r.get("created_at", ""),
            }
        )
    activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return {"activities": activity[:10]}
