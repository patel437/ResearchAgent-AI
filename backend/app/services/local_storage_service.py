"""
Local file-system storage service.

Replaces IBM Cloud Object Storage with secure local disk storage.

Directory layout:
  {LOCAL_STORAGE_PATH}/
      research_papers/{user_id}/{uuid}_{filename}.pdf
      generated_reports/{user_id}/{uuid}_{slug}.md
      generated_reports/{user_id}/{uuid}_{slug}.docx   (if requested)

Security:
  - Filenames are sanitised (no path traversal).
  - The resolved path is verified to stay inside the base directory.
  - Files are retrieved only after the caller confirms the user_id matches
    the stored metadata (enforced at the endpoint layer via Cloudant lookup).
"""
import logging
import mimetypes
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Subdirectory names ────────────────────────────────────────
SUBDIR_PDFS = "research_papers"
SUBDIR_REPORTS = "generated_reports"


def _sanitize_filename(name: str) -> str:
    """Remove path separators and dangerous characters from a filename."""
    name = os.path.basename(name)                   # strip any directory components
    name = re.sub(r"[^\w.\- ]", "_", name)          # allow only word chars, dots, dashes, spaces
    name = re.sub(r"\s+", "_", name).strip("_. ")   # collapse whitespace
    return name[:200] or "file"                     # cap length; never empty


def _safe_path(base: Path, *parts: str) -> Path:
    """Resolve a path and raise if it escapes the base directory."""
    resolved = (base / Path(*parts)).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise ValueError(f"Path traversal detected: {resolved}")
    return resolved


class LocalStorageService:
    """Manages all local file I/O for uploaded PDFs and generated reports."""

    def __init__(self):
        self._base: Optional[Path] = None

    @property
    def base(self) -> Path:
        if self._base is None:
            self._base = Path(settings.LOCAL_STORAGE_PATH).resolve()
            self._base.mkdir(parents=True, exist_ok=True)
            (self._base / SUBDIR_PDFS).mkdir(exist_ok=True)
            (self._base / SUBDIR_REPORTS).mkdir(exist_ok=True)
            logger.info("Local storage initialised at %s", self._base)
        return self._base

    # ── PDF upload ────────────────────────────────────────────────
    def save_pdf(self, file_bytes: bytes, original_filename: str, user_id: str) -> dict:
        """
        Persist a PDF to disk.

        Returns a metadata dict:
            file_id, filename, local_path (str), size_bytes, uploaded_at
        """
        safe_name = _sanitize_filename(original_filename)
        file_id = str(uuid.uuid4())
        stored_name = f"{file_id}_{safe_name}"

        user_dir = _safe_path(self.base / SUBDIR_PDFS, user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        dest = _safe_path(user_dir, stored_name)
        dest.write_bytes(file_bytes)
        logger.info("PDF saved: %s (%d bytes)", dest, len(file_bytes))

        return {
            "file_id": file_id,
            "filename": safe_name,
            "stored_name": stored_name,
            "local_path": str(dest),
            "size_bytes": len(file_bytes),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
        }

    def get_pdf_path(self, user_id: str, stored_name: str) -> Optional[Path]:
        """Return the absolute path to a PDF, or None if not found."""
        try:
            path = _safe_path(self.base / SUBDIR_PDFS / user_id, stored_name)
            return path if path.is_file() else None
        except ValueError:
            return None

    def list_pdfs(self, user_id: str) -> list[str]:
        """List stored filenames for a user."""
        user_dir = self.base / SUBDIR_PDFS / user_id
        if not user_dir.is_dir():
            return []
        return [p.name for p in sorted(user_dir.iterdir()) if p.suffix.lower() == ".pdf"]

    def delete_pdf(self, user_id: str, stored_name: str) -> bool:
        """Delete a stored PDF. Returns True on success."""
        path = self.get_pdf_path(user_id, stored_name)
        if path and path.is_file():
            path.unlink()
            logger.info("PDF deleted: %s", path)
            return True
        return False

    # ── Report storage ─────────────────────────────────────────────
    def save_report(
        self,
        content: str,
        topic: str,
        user_id: str,
        fmt: str = "md",
    ) -> dict:
        """
        Persist a generated report to disk.

        fmt: "md" | "docx"
        Returns a metadata dict: file_id, filename, local_path, size_bytes, created_at
        """
        file_id = str(uuid.uuid4())
        slug = re.sub(r"[^\w\- ]", "", topic)[:50].strip().replace(" ", "_") or "report"
        ext = "md" if fmt == "md" else "docx"
        stored_name = f"{file_id}_{slug}.{ext}"

        user_dir = _safe_path(self.base / SUBDIR_REPORTS, user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        dest = _safe_path(user_dir, stored_name)

        if fmt == "docx":
            data = _markdown_to_docx(content)
            dest.write_bytes(data)
        else:
            dest.write_text(content, encoding="utf-8")

        logger.info("Report saved: %s (%d bytes)", dest, dest.stat().st_size)

        return {
            "file_id": file_id,
            "filename": stored_name,
            "local_path": str(dest),
            "format": ext,
            "size_bytes": dest.stat().st_size,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "topic": topic,
        }

    def get_report_path(self, user_id: str, stored_name: str) -> Optional[Path]:
        """Return the absolute path to a report file, or None if not found."""
        try:
            path = _safe_path(self.base / SUBDIR_REPORTS / user_id, stored_name)
            return path if path.is_file() else None
        except ValueError:
            return None

    def delete_report_file(self, user_id: str, stored_name: str) -> bool:
        """Delete a stored report file."""
        path = self.get_report_path(user_id, stored_name)
        if path and path.is_file():
            path.unlink()
            return True
        return False

    # ── Disk usage ─────────────────────────────────────────────────
    def storage_stats(self, user_id: str) -> dict:
        """Return PDF count, report count, and total bytes for a user."""
        pdf_dir = self.base / SUBDIR_PDFS / user_id
        rpt_dir = self.base / SUBDIR_REPORTS / user_id

        def _dir_stats(d: Path) -> tuple[int, int]:
            if not d.is_dir():
                return 0, 0
            files = list(d.iterdir())
            return len(files), sum(f.stat().st_size for f in files if f.is_file())

        pdf_count, pdf_bytes = _dir_stats(pdf_dir)
        rpt_count, rpt_bytes = _dir_stats(rpt_dir)
        return {
            "pdf_count": pdf_count,
            "pdf_bytes": pdf_bytes,
            "report_count": rpt_count,
            "report_bytes": rpt_bytes,
            "total_bytes": pdf_bytes + rpt_bytes,
        }


# ── DOCX generation helper ────────────────────────────────────────
def _markdown_to_docx(md_text: str) -> bytes:
    """Convert Markdown text to a .docx byte stream using python-docx."""
    try:
        from io import BytesIO

        from docx import Document
        from docx.shared import Pt, RGBColor

        doc = Document()

        # Title style
        style = doc.styles["Normal"]
        style.font.name = "Calibri"
        style.font.size = Pt(11)

        for line in md_text.splitlines():
            stripped = line.rstrip()
            if stripped.startswith("# "):
                p = doc.add_heading(stripped[2:], level=1)
            elif stripped.startswith("## "):
                p = doc.add_heading(stripped[3:], level=2)
            elif stripped.startswith("### "):
                p = doc.add_heading(stripped[4:], level=3)
            elif stripped.startswith("#### "):
                p = doc.add_heading(stripped[5:], level=4)
            elif stripped.startswith("- ") or stripped.startswith("* "):
                p = doc.add_paragraph(stripped[2:], style="List Bullet")
            elif re.match(r"^\d+\. ", stripped):
                text = re.sub(r"^\d+\. ", "", stripped)
                p = doc.add_paragraph(text, style="List Number")
            elif stripped.startswith("---") or stripped.startswith("==="):
                doc.add_paragraph()          # visual break
            elif stripped == "":
                doc.add_paragraph()
            else:
                # Handle inline bold (**text**)
                para = doc.add_paragraph()
                _add_inline_formatted(para, stripped)

        buf = BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.read()

    except ImportError:
        # python-docx not installed; fall back to plain-text bytes
        logger.warning("python-docx not installed; DOCX export fell back to plain text")
        return md_text.encode("utf-8")


def _add_inline_formatted(para, text: str) -> None:
    """Split a line on **bold** markers and add runs accordingly."""
    parts = re.split(r"(\*\*[^*]+\*\*)", text)
    for part in parts:
        if part.startswith("**") and part.endswith("**"):
            run = para.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("*") and part.endswith("*"):
            run = para.add_run(part[1:-1])
            run.italic = True
        else:
            para.add_run(part)


# Singleton
local_storage = LocalStorageService()
