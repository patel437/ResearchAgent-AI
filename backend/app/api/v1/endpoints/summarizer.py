"""
Paper summarizer endpoint.

Workflow:
  1. Validate & receive PDF upload.
  2. Store PDF to local disk via LocalStorageService.
  3. Record file metadata in IBM Cloudant.
  4. Extract text with PyMuPDF.
  5. Generate structured summary via IBM Granite (watsonx.ai).
  6. Return summary + file metadata to the caller.

Access control:
  All file-retrieval endpoints verify that the requesting user_id
  matches the user_id stored in the Cloudant metadata record.
"""
import io
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.core.config import settings
from app.services.cloudant_service import cloudant_service
from app.services.granite_service import granite_service
from app.services.local_storage_service import local_storage

router = APIRouter()

# ── PDF text extraction ──────────────────────────────────────────


def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using PyMuPDF."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        parts = [page.get_text() for page in doc]
        doc.close()
        return "\n\n".join(parts)
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF extraction library unavailable. Run: pip install PyMuPDF",
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {exc}")


# ── Upload & summarise ───────────────────────────────────────────


@router.post("/upload")
async def upload_and_summarize(
    file: UploadFile = File(...),
    user_id: str = Form(default="demo-user"),
    title: str = Form(default=""),
):
    """
    Upload a research PDF, save it locally, record metadata in Cloudant,
    extract text, and generate an IBM Granite structured summary.
    """
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    file_bytes = await file.read()
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {settings.MAX_UPLOAD_MB} MB)",
        )

    # 1. Save PDF to local disk
    file_meta = local_storage.save_pdf(file_bytes, file.filename or "upload.pdf", user_id)

    # 2. Record metadata in Cloudant
    try:
        cloudant_service.save_pdf_metadata(user_id, file_meta)
    except Exception:
        pass  # Non-fatal; local file is still accessible

    # 3. Extract text
    extracted_text = _extract_pdf_text(file_bytes)
    if len(extracted_text.strip()) < 100:
        raise HTTPException(
            status_code=400, detail="Could not extract sufficient text from the PDF"
        )

    # 4. IBM Granite summarisation
    paper_title = title or Path(file.filename or "paper").stem
    try:
        result = await granite_service.summarize_paper(extracted_text, paper_title)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI summarisation error: {exc}")

    return {
        "filename": file_meta["filename"],
        "title": paper_title,
        "file_id": file_meta["file_id"],
        "stored_name": file_meta["stored_name"],
        "size_bytes": file_meta["size_bytes"],
        "extracted_chars": len(extracted_text),
        "word_count": len(extracted_text.split()),
        "summary": result["summary"],
        "storage": "local",
    }


# ── Summarise plain text ─────────────────────────────────────────


@router.post("/text")
async def summarize_text(body: dict):
    """Summarise directly supplied text (no file upload needed)."""
    text = body.get("text", "")
    title = body.get("title", "")
    if len(text.strip()) < 100:
        raise HTTPException(status_code=400, detail="Text too short to summarise")
    try:
        result = await granite_service.summarize_paper(text, title)
        return {"summary": result["summary"], "title": title}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── List uploaded PDFs ───────────────────────────────────────────


@router.get("/uploads")
async def list_uploads(user_id: str = Query(default="demo-user")):
    """Return all PDF upload records for a user (metadata from Cloudant)."""
    records = cloudant_service.get_uploaded_pdfs(user_id)
    # Fall back to scanning the local directory if Cloudant is unavailable
    if not records:
        names = local_storage.list_pdfs(user_id)
        records = [{"stored_name": n, "user_id": user_id} for n in names]
    return {"uploads": records, "total": len(records)}


# ── Download original PDF ────────────────────────────────────────


@router.get("/download/pdf/{file_id}")
async def download_pdf(
    file_id: str,
    user_id: str = Query(default="demo-user"),
):
    """
    Download a previously uploaded PDF.
    The file is served only if the stored user_id matches the requester.
    """
    # Authorisation: look up metadata
    meta = cloudant_service.get_pdf_metadata(file_id)
    if meta and meta.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    stored_name = (meta or {}).get("stored_name")
    if not stored_name:
        # Cloudant not configured – try to resolve from local dir listing
        names = local_storage.list_pdfs(user_id)
        matching = [n for n in names if n.startswith(file_id)]
        if not matching:
            raise HTTPException(status_code=404, detail="File not found")
        stored_name = matching[0]

    path = local_storage.get_pdf_path(user_id, stored_name)
    if not path:
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=(meta or {}).get("filename", stored_name),
    )


# ── Delete an uploaded PDF ───────────────────────────────────────


@router.delete("/uploads/{file_id}")
async def delete_upload(
    file_id: str,
    rev: str = Query(default=""),
    user_id: str = Query(default="demo-user"),
):
    """Delete an uploaded PDF (local file + Cloudant metadata record)."""
    meta = cloudant_service.get_pdf_metadata(file_id)
    if meta and meta.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    stored_name = (meta or {}).get("stored_name", "")
    disk_deleted = local_storage.delete_pdf(user_id, stored_name)

    cloudant_deleted = False
    if meta and rev:
        cloudant_deleted = cloudant_service.delete_pdf_metadata(file_id, rev)

    return {"success": disk_deleted, "disk_deleted": disk_deleted, "cloudant_deleted": cloudant_deleted}


# ── Download a summary as Markdown ──────────────────────────────


@router.post("/download/summary")
async def download_summary(body: dict):
    """Download a Markdown summary supplied in the request body."""
    summary = body.get("summary", "")
    title = body.get("title", "summary")
    if not summary:
        raise HTTPException(status_code=400, detail="No summary content provided")
    safe_title = title.replace(" ", "_")[:60]
    return StreamingResponse(
        io.BytesIO(summary.encode("utf-8")),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}_summary.md"'},
    )
