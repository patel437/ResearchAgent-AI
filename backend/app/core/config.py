"""Application configuration using pydantic-settings."""
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env path relative to THIS file so it works regardless of
# which directory uvicorn is launched from.
# __file__ = backend/app/core/config.py  →  .parent×3 = backend/
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── IBM watsonx.ai ────────────────────────────────────────
    IBM_API_KEY: Optional[str] = None
    WATSONX_PROJECT_ID: Optional[str] = None
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    GRANITE_MODEL_ID: str = "ibm/granite-4-h-small"

    # ── IBM Cloudant ──────────────────────────────────────────
    CLOUDANT_URL: Optional[str] = None
    CLOUDANT_APIKEY: Optional[str] = None
    CLOUDANT_DB_PROJECTS: str = "research_projects"
    CLOUDANT_DB_PAPERS: str = "research_papers"
    CLOUDANT_DB_REPORTS: str = "research_reports"
    CLOUDANT_DB_REFERENCES: str = "references"
    CLOUDANT_DB_CHATS: str = "chat_history"
    CLOUDANT_DB_USERS: str = "users"

    # ── Local document storage (replaces IBM COS) ─────────────
    LOCAL_STORAGE_PATH: str = "uploads"
    MAX_UPLOAD_MB: int = 50

    # ── Application ───────────────────────────────────────────
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    DEMO_MODE: bool = False

    # ── External APIs ─────────────────────────────────────────
    OPENALEX_EMAIL: str = "researcher@example.com"
    ARXIV_BASE_URL: str = "http://export.arxiv.org/api/query"
    CROSSREF_BASE_URL: str = "https://api.crossref.org/works"

    @property
    def has_ibm_credentials(self) -> bool:
        return bool(
            self.IBM_API_KEY
            and self.WATSONX_PROJECT_ID
            and self.IBM_API_KEY != "your_ibm_cloud_api_key_here"
            and self.WATSONX_PROJECT_ID != "your_watsonx_project_id_here"
        )

    @property
    def has_cloudant(self) -> bool:
        return bool(
            self.CLOUDANT_URL
            and self.CLOUDANT_APIKEY
            and self.CLOUDANT_URL != "https://your-instance.cloudantnosqldb.appdomain.cloud"
        )

    @property
    def is_demo(self) -> bool:
        return self.DEMO_MODE or not self.has_ibm_credentials

    def debug_info(self) -> dict:
        """Return a safe debug snapshot (no secret values exposed)."""
        key = self.IBM_API_KEY or ""
        pid = self.WATSONX_PROJECT_ID or ""
        return {
            "env_file_path": str(_ENV_FILE),
            "env_file_exists": _ENV_FILE.exists(),
            "IBM_API_KEY_set": bool(key) and key != "your_ibm_cloud_api_key_here",
            "IBM_API_KEY_prefix": key[:6] + "…" if len(key) > 6 else "(empty)",
            "WATSONX_PROJECT_ID_set": bool(pid) and pid != "your_watsonx_project_id_here",
            "WATSONX_PROJECT_ID_prefix": pid[:8] + "…" if len(pid) > 8 else "(empty)",
            "WATSONX_URL": self.WATSONX_URL,
            "GRANITE_MODEL_ID": self.GRANITE_MODEL_ID,
            "DEMO_MODE_env": self.DEMO_MODE,
            "has_ibm_credentials": self.has_ibm_credentials,
            "is_demo": self.is_demo,
            "has_cloudant": self.has_cloudant,
        }


settings = Settings()
