"""
ResearchAgent AI - FastAPI Backend Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    # ── Startup ───────────────────────────────────────────────
    logger.info("ResearchAgent AI starting up …")
    # Ensure all Cloudant databases exist
    try:
        from app.services.cloudant_service import cloudant_service
        cloudant_service.ensure_databases()
        logger.info("Cloudant database check complete")
    except Exception as exc:
        logger.warning("Cloudant startup check failed (non-fatal): %s", exc)
    logger.info(
        "Ready  demo_mode=%s  ibm=%s  cloudant=%s",
        settings.is_demo,
        settings.has_ibm_credentials,
        settings.has_cloudant,
    )
    yield
    # ── Shutdown ──────────────────────────────────────────────
    logger.info("ResearchAgent AI shutting down …")


app = FastAPI(
    title="ResearchAgent AI",
    description="AI-powered research agent using IBM Granite and IBM Cloud services",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "ResearchAgent AI",
        "version": "1.0.0",
        "status": "running",
        "demo_mode": settings.is_demo,
        "ibm_connected": settings.has_ibm_credentials,
    }


@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "demo_mode": settings.is_demo,
        "ibm_connected": settings.has_ibm_credentials,
        "cloudant_connected": settings.has_cloudant,
    }


@app.get("/api/debug", tags=["Health"])
async def debug():
    """Credential diagnostics — shows what the server actually loaded from .env.
    Safe to call: secret values are never returned, only prefixes."""
    return settings.debug_info()
