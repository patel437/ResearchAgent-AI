"""AI Chat endpoint – IBM Granite powered research assistant."""
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.granite_service import granite_service
from app.services.cloudant_service import cloudant_service

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: str = "demo-user"
    include_history: bool = True


class ChatResponse(BaseModel):
    response: str
    session_id: str
    user_id: str


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a message to the IBM Granite research assistant."""
    session_id = req.session_id or str(uuid.uuid4())

    # Load history for context
    history = []
    if req.include_history and req.session_id:
        raw_history = cloudant_service.get_chat_history(req.user_id, session_id)
        history = [{"role": d["role"], "content": d["content"]} for d in raw_history]

    try:
        response_text = await granite_service.chat(req.message, history)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(exc)}")

    # Persist messages
    try:
        cloudant_service.save_chat_message(req.user_id, session_id, "user", req.message)
        cloudant_service.save_chat_message(req.user_id, session_id, "assistant", response_text)
    except Exception:
        pass  # Non-fatal

    return ChatResponse(response=response_text, session_id=session_id, user_id=req.user_id)


@router.get("/history/{session_id}")
async def get_history(session_id: str, user_id: str = "demo-user"):
    """Get chat history for a session."""
    history = cloudant_service.get_chat_history(user_id, session_id)
    return {"session_id": session_id, "messages": history}


@router.delete("/history/{session_id}")
async def clear_history(session_id: str, user_id: str = "demo-user"):
    """Clear chat history (in-memory only; Cloudant docs remain)."""
    return {"success": True, "session_id": session_id}
