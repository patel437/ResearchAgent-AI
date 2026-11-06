"""Main API router – aggregates all v1 sub-routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    search,
    chat,
    summarizer,
    gaps,
    hypotheses,
    reports,
    references,
    projects,
    auth,
    dashboard,
    ibm,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(search.router, prefix="/search", tags=["Research Search"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI Chat"])
api_router.include_router(summarizer.router, prefix="/summarizer", tags=["Paper Summarizer"])
api_router.include_router(gaps.router, prefix="/gaps", tags=["Research Gaps"])
api_router.include_router(hypotheses.router, prefix="/hypotheses", tags=["Hypotheses"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(references.router, prefix="/references", tags=["References"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(ibm.router, prefix="/ibm", tags=["IBM Connectivity"])
