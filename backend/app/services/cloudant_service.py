"""
IBM Cloudant database service.

Handles all persistence operations for:
  - Research projects
  - Saved papers
  - Research reports
  - References / citations
  - Chat history
  - User profiles
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CloudantService:
    """Thin async wrapper around the IBM Cloudant HTTP API."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not settings.has_cloudant:
            return None
        try:
            from ibmcloudant.cloudant_v1 import CloudantV1
            from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

            authenticator = IAMAuthenticator(settings.CLOUDANT_APIKEY)
            self._client = CloudantV1(authenticator=authenticator)
            self._client.set_service_url(settings.CLOUDANT_URL)
            logger.info("IBM Cloudant client initialized")
            return self._client
        except Exception as exc:
            logger.warning("Could not initialize Cloudant client: %s", exc)
            return None

    # ── Database setup ─────────────────────────────────────────
    def ensure_databases(self):
        """Create required databases and indexes if they don't exist."""
        client = self._get_client()
        if not client:
            logger.info("Cloudant not configured – running in-memory mode")
            return
        dbs = [
            settings.CLOUDANT_DB_PROJECTS,
            settings.CLOUDANT_DB_PAPERS,
            settings.CLOUDANT_DB_REPORTS,
            settings.CLOUDANT_DB_REFERENCES,
            settings.CLOUDANT_DB_CHATS,
            settings.CLOUDANT_DB_USERS,
        ]
        for db in dbs:
            try:
                client.put_database(db=db).get_result()
                logger.info("Created Cloudant DB: %s", db)
            except Exception as exc:
                if "412" in str(exc) or "file_exists" in str(exc).lower() or "CONFLICT" in str(exc):
                    pass  # Already exists
                else:
                    logger.warning("Could not create DB %s: %s", db, exc)

        # Create query indexes for optimal performance
        _index_map = [
            (settings.CLOUDANT_DB_REFERENCES, ["type", "user_id"]),
            (settings.CLOUDANT_DB_PAPERS,     ["type", "user_id"]),
            (settings.CLOUDANT_DB_REPORTS,    ["type", "user_id"]),
            (settings.CLOUDANT_DB_PROJECTS,   ["type", "user_id"]),
            (settings.CLOUDANT_DB_CHATS,      ["type", "user_id", "session_id"]),
        ]
        for db, fields in _index_map:
            try:
                client.post_index(
                    db=db,
                    index={"fields": fields},
                    name="user_type_idx",
                    type="json",
                ).get_result()
            except Exception:
                pass  # Index already exists or non-fatal

    # ── Generic CRUD ───────────────────────────────────────────
    def _save_document(self, db_name: str, doc: dict) -> dict:
        client = self._get_client()
        if not client:
            return {**doc, "_id": doc.get("_id", str(uuid.uuid4())), "_demo": True}
        try:
            result = client.post_document(db=db_name, document=doc).get_result()
            return {**doc, "_id": result["id"], "_rev": result["rev"]}
        except Exception as exc:
            # If the database doesn't exist yet, create it and retry once
            if "not_found" in str(exc).lower() or "404" in str(exc):
                try:
                    client.put_database(db=db_name).get_result()
                    logger.info("Auto-created Cloudant DB: %s", db_name)
                    result = client.post_document(db=db_name, document=doc).get_result()
                    return {**doc, "_id": result["id"], "_rev": result["rev"]}
                except Exception as inner_exc:
                    logger.error("Cloudant save error after DB creation (%s): %s", db_name, inner_exc)
                    raise inner_exc
            logger.error("Cloudant save error (%s): %s", db_name, exc)
            raise

    def _get_document(self, db_name: str, doc_id: str) -> Optional[dict]:
        client = self._get_client()
        if not client:
            return None
        try:
            return client.get_document(db=db_name, doc_id=doc_id).get_result()
        except Exception as exc:
            logger.warning("Cloudant get error (%s/%s): %s", db_name, doc_id, exc)
            return None

    def _query_documents(
        self, db_name: str, selector: dict, limit: int = 50, skip: int = 0
    ) -> list[dict]:
        client = self._get_client()
        if not client:
            return []
        try:
            result = client.post_find(
                db=db_name,
                selector=selector,
                limit=limit,
                skip=skip,
            ).get_result()
            return result.get("docs", [])
        except Exception as exc:
            logger.warning("Cloudant query error (%s): %s", db_name, exc)
            return []

    def _delete_document(self, db_name: str, doc_id: str, rev: str) -> bool:
        client = self._get_client()
        if not client:
            return True
        try:
            client.delete_document(db=db_name, doc_id=doc_id, rev=rev).get_result()
            return True
        except Exception as exc:
            logger.warning("Cloudant delete error: %s", exc)
            return False

    # ── Projects ───────────────────────────────────────────────
    def save_project(self, user_id: str, name: str, description: str = "") -> dict:
        doc = {
            "_id": str(uuid.uuid4()),
            "type": "project",
            "user_id": user_id,
            "name": name,
            "description": description,
            "created_at": _now(),
            "updated_at": _now(),
            "paper_count": 0,
        }
        return self._save_document(settings.CLOUDANT_DB_PROJECTS, doc)

    def get_projects(self, user_id: str) -> list[dict]:
        return self._query_documents(
            settings.CLOUDANT_DB_PROJECTS, {"type": "project", "user_id": user_id}
        )

    # ── Papers ─────────────────────────────────────────────────
    def save_paper(self, user_id: str, paper: dict, project_id: Optional[str] = None) -> dict:
        doc = {
            "_id": str(uuid.uuid4()),
            "type": "paper",
            "user_id": user_id,
            "project_id": project_id,
            "title": paper.get("title", ""),
            "authors": paper.get("authors", []),
            "abstract": paper.get("abstract", ""),
            "year": paper.get("year"),
            "doi": paper.get("doi", ""),
            "source_url": paper.get("source_url", ""),
            "source": paper.get("source", ""),
            "domain": paper.get("domain", ""),
            "saved_at": _now(),
        }
        return self._save_document(settings.CLOUDANT_DB_PAPERS, doc)

    def get_saved_papers(self, user_id: str, project_id: Optional[str] = None) -> list[dict]:
        selector: dict = {"type": "paper", "user_id": user_id}
        if project_id:
            selector["project_id"] = project_id
        return self._query_documents(settings.CLOUDANT_DB_PAPERS, selector)

    # ── Reports ────────────────────────────────────────────────
    def save_report(
        self,
        user_id: str,
        topic: str,
        content: str,
        references: list,
        file_metadata: Optional[dict] = None,
    ) -> dict:
        """
        Persist a report record.  ``file_metadata`` is the dict returned by
        ``LocalStorageService.save_report()`` and contains local_path,
        filename, format, size_bytes etc.
        """
        doc = {
            "_id": str(uuid.uuid4()),
            "type": "report",
            "user_id": user_id,
            "topic": topic,
            "content": content,
            "references": references,
            "created_at": _now(),
            "file_metadata": file_metadata or {},
        }
        return self._save_document(settings.CLOUDANT_DB_REPORTS, doc)

    def get_reports(self, user_id: str) -> list[dict]:
        return self._query_documents(
            settings.CLOUDANT_DB_REPORTS, {"type": "report", "user_id": user_id}
        )

    def get_report(self, report_id: str) -> Optional[dict]:
        return self._get_document(settings.CLOUDANT_DB_REPORTS, report_id)

    # ── References ─────────────────────────────────────────────
    def save_reference(self, user_id: str, paper: dict) -> dict:
        doc = {
            "_id": str(uuid.uuid4()),
            "type": "reference",
            "user_id": user_id,
            "title": paper.get("title", ""),
            "authors": paper.get("authors", []),
            "year": paper.get("year"),
            "doi": paper.get("doi", ""),
            "journal": paper.get("journal", ""),
            "url": paper.get("source_url", ""),
            "source": paper.get("source", ""),
            "added_at": _now(),
        }
        return self._save_document(settings.CLOUDANT_DB_REFERENCES, doc)

    def get_references(self, user_id: str) -> list[dict]:
        return self._query_documents(
            settings.CLOUDANT_DB_REFERENCES, {"type": "reference", "user_id": user_id}
        )

    def delete_reference(self, ref_id: str, rev: str) -> bool:
        return self._delete_document(settings.CLOUDANT_DB_REFERENCES, ref_id, rev)

    # ── Chat history ───────────────────────────────────────────
    def save_chat_message(
        self, user_id: str, session_id: str, role: str, content: str
    ) -> dict:
        doc = {
            "_id": str(uuid.uuid4()),
            "type": "chat_message",
            "user_id": user_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": _now(),
        }
        return self._save_document(settings.CLOUDANT_DB_CHATS, doc)

    def get_chat_history(self, user_id: str, session_id: str) -> list[dict]:
        docs = self._query_documents(
            settings.CLOUDANT_DB_CHATS,
            {"type": "chat_message", "user_id": user_id, "session_id": session_id},
            limit=100,
        )
        return sorted(docs, key=lambda d: d.get("timestamp", ""))

    # ── Uploaded PDF file metadata ──────────────────────────────
    def save_pdf_metadata(self, user_id: str, file_meta: dict) -> dict:
        """
        Store metadata for an uploaded PDF.  ``file_meta`` is the dict
        returned by ``LocalStorageService.save_pdf()``.
        """
        doc = {
            "_id": file_meta.get("file_id", str(uuid.uuid4())),
            "type": "uploaded_pdf",
            "user_id": user_id,
            **file_meta,
        }
        return self._save_document(settings.CLOUDANT_DB_PAPERS, doc)

    def get_uploaded_pdfs(self, user_id: str) -> list[dict]:
        """List all PDF upload records for a user."""
        return self._query_documents(
            settings.CLOUDANT_DB_PAPERS,
            {"type": "uploaded_pdf", "user_id": user_id},
        )

    def get_pdf_metadata(self, file_id: str) -> Optional[dict]:
        """Retrieve a single PDF metadata record by file_id."""
        return self._get_document(settings.CLOUDANT_DB_PAPERS, file_id)

    def delete_pdf_metadata(self, file_id: str, rev: str) -> bool:
        return self._delete_document(settings.CLOUDANT_DB_PAPERS, file_id, rev)

    # ── User stats ─────────────────────────────────────────────
    def get_user_stats(self, user_id: str) -> dict:
        return {
            "total_papers": len(self.get_saved_papers(user_id)),
            "total_reports": len(self.get_reports(user_id)),
            "total_references": len(self.get_references(user_id)),
            "total_projects": len(self.get_projects(user_id)),
        }


# Singleton instance
cloudant_service = CloudantService()
