"""IBM connectivity test endpoint."""
from fastapi import APIRouter
from app.services.granite_service import granite_service
from app.core.config import settings

router = APIRouter()


@router.get("/test")
async def test_ibm_connection():
    """
    Live test of IBM watsonx.ai connectivity.
    Returns pass/fail with actionable fix instructions.
    Safe to call — no credentials are returned.
    """
    result = await granite_service.test_connection()
    return result


@router.get("/status")
async def ibm_status():
    """Quick config status without making a live API call."""
    return {
        "ibm_api_key_configured": settings.has_ibm_credentials,
        "cloudant_configured": settings.has_cloudant,
        "watsonx_url": settings.WATSONX_URL,
        "granite_model": settings.GRANITE_MODEL_ID,
        "is_demo": settings.is_demo,
        "demo_mode_env": settings.DEMO_MODE,
    }
