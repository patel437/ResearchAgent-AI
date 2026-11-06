"""Auth endpoints – simple JWT-based authentication."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.services.cloudant_service import cloudant_service

router = APIRouter()

# Simple in-memory user store for demo (replace with Cloudant in production)
_users: dict[str, dict] = {}

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def _create_token(user_id: str, email: str) -> str:
    try:
        from jose import jwt

        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        return jwt.encode(
            {"sub": user_id, "email": email, "exp": expire},
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
    except ImportError:
        return f"demo-token-{user_id}"


def _hash_password(password: str) -> str:
    try:
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    except ImportError:
        return f"hashed-{password}"


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(plain, hashed)
    except ImportError:
        return hashed == f"hashed-{plain}"


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str
    email: str


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    if req.email in _users:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    _users[req.email] = {
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "password_hash": _hash_password(req.password),
    }
    token = _create_token(user_id, req.email)
    return AuthResponse(token=token, user_id=user_id, name=req.name, email=req.email)


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = _users.get(req.email)
    if not user or not _verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = _create_token(user["id"], req.email)
    return AuthResponse(token=token, user_id=user["id"], name=user["name"], email=req.email)


@router.get("/me")
async def get_me():
    """Return demo user info (in production, decode JWT)."""
    return {"user_id": "demo-user", "name": "Researcher", "email": "researcher@example.com"}
