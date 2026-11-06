"""Research projects endpoint."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.services.cloudant_service import cloudant_service

router = APIRouter()


class CreateProjectRequest(BaseModel):
    user_id: str = "demo-user"
    name: str
    description: str = ""


@router.post("")
async def create_project(req: CreateProjectRequest):
    """Create a new research project."""
    try:
        project = cloudant_service.save_project(req.user_id, req.name, req.description)
        return {"success": True, "project": project}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("")
async def list_projects(user_id: str = Query(default="demo-user")):
    """List all research projects for a user."""
    projects = cloudant_service.get_projects(user_id)
    return {"projects": projects, "total": len(projects)}


@router.get("/{project_id}/papers")
async def get_project_papers(project_id: str, user_id: str = Query(default="demo-user")):
    """Get all papers saved under a project."""
    papers = cloudant_service.get_saved_papers(user_id, project_id)
    return {"papers": papers, "total": len(papers)}
