# ResearchAgent AI

**AI-Powered Research Automation Platform**  
AICTE–IBM SkillsBuild Internship Project

---

## 🎯 Overview

ResearchAgent AI is a complete, production-ready web application that automates academic research workflows using **IBM Granite AI** (via IBM watsonx.ai) as the core AI engine, **IBM Cloudant** for persistent storage, and **local disk storage** for document management (no paid IBM COS subscription required).

| Technology | Role |
|---|---|
| IBM Granite 3 (8B Instruct) | All AI tasks: query understanding, summarisation, gap analysis, hypotheses, reports |
| IBM watsonx.ai | AI inference platform for deploying Granite |
| IBM Cloudant | NoSQL database for projects, papers, reports, references, chat history |
| Local Disk Storage | Uploaded PDFs → `uploads/research_papers/` · Reports → `uploads/generated_reports/` |
| Python FastAPI | RESTful backend API |
| React + TypeScript | Frontend single-page application |
| Tailwind CSS | Utility-first styling |
| OpenAlex / arXiv / Crossref | Free academic literature APIs |

> **Note on IBM COS:** IBM Cloud Object Storage has been replaced with secure local file-system storage. IBM Granite (watsonx.ai) and IBM Cloudant remain genuine IBM Cloud integrations.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- IBM Cloud account (for real AI; demo mode works without credentials)

### 1. Setup Environment

```bash
# From the project root
cp .env.example backend/.env
# Edit backend/.env – add IBM watsonx.ai and Cloudant credentials
```

### 2. Start the Backend

```bash
cd backend

# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
# python -m venv venv && source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The server auto-creates `backend/uploads/` on first run:
```
backend/uploads/
    research_papers/     ← uploaded PDFs (per user sub-directory)
    generated_reports/   ← generated .md and .docx reports (per user)
```

Backend: http://localhost:8000  
API Docs: http://localhost:8000/api/docs

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## 🔧 IBM Cloud Configuration

### Step 1: Create IBM Cloud Account
Go to [https://cloud.ibm.com](https://cloud.ibm.com) and create a free account.

### Step 2: Set Up IBM watsonx.ai *(Required for AI features)*

1. Navigate to [https://dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)
2. Create a new **Project**
3. Note the **Project ID** from project settings
4. Go to IBM Cloud → Manage → Access → API Keys → **Create API key**
5. Copy the key (shown once only)

### Step 3: Set Up IBM Cloudant *(Optional — free Lite tier)*

1. IBM Cloud Catalog → **Cloudant** → Create (Lite tier = free)
2. Service Credentials → New Credential
3. Copy `apikey` and `url` from the credential JSON

### Step 4: Update `backend/.env`

```env
# IBM watsonx.ai (required for AI)
IBM_API_KEY=your_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
GRANITE_MODEL_ID=ibm/granite-3-8b-instruct

# IBM Cloudant (optional)
CLOUDANT_URL=https://your-instance.cloudantnosqldb.appdomain.cloud
CLOUDANT_APIKEY=your_cloudant_api_key

# Local Document Storage (replaces IBM COS — no paid subscription)
LOCAL_STORAGE_PATH=uploads
MAX_UPLOAD_MB=50

# App
DEMO_MODE=false
SECRET_KEY=change-this-to-a-random-256-bit-string
```

### Step 5: Verify

```bash
curl http://localhost:8000/api/health
# {"status":"healthy","demo_mode":false}
```

---

## 📦 Project Structure

```
ScholarPulse/
├── .env.example                       # Template for all env vars (no COS vars)
├── README.md
├── backend/
│   ├── main.py                        # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env                           # Your credentials (not committed)
│   ├── uploads/                       # Auto-created on first run
│   │   ├── research_papers/           # Uploaded PDFs per user
│   │   └── generated_reports/         # Generated .md/.docx reports per user
│   └── app/
│       ├── core/
│       │   └── config.py              # Settings (no COS vars)
│       ├── services/
│       │   ├── granite_service.py     # IBM Granite AI engine
│       │   ├── cloudant_service.py    # IBM Cloudant (+ PDF metadata methods)
│       │   ├── local_storage_service.py # Local PDF/report storage (replaces COS)
│       │   ├── search_service.py      # OpenAlex + arXiv + Crossref
│       │   └── citation_service.py    # APA/MLA/IEEE/BibTeX
│       └── api/v1/endpoints/
│           ├── auth.py
│           ├── dashboard.py           # Includes local storage stats
│           ├── search.py
│           ├── chat.py
│           ├── summarizer.py          # PDF upload → local disk + Cloudant metadata
│           ├── gaps.py
│           ├── hypotheses.py
│           ├── reports.py             # Report → local disk (.md/.docx) + Cloudant
│           ├── references.py
│           └── projects.py
└── frontend/
    └── src/
        ├── services/api.ts            # All API calls (updated for local storage)
        ├── pages/
        │   ├── Dashboard.tsx          # Shows local storage stats
        │   ├── PaperSummarizer.tsx    # PDF saved locally badge
        │   ├── ReportGenerator.tsx    # .md and .docx download buttons
        │   └── Settings.tsx           # Local storage documentation
        └── ...
```

---

## 🗂️ Local Document Storage

### How it works

Files are stored under `backend/uploads/` (configurable via `LOCAL_STORAGE_PATH`):

```
uploads/
    research_papers/
        {user_id}/
            {uuid}_{original_filename}.pdf
    generated_reports/
        {user_id}/
            {uuid}_{topic_slug}.md
            {uuid}_{topic_slug}.docx   ← Word document (if requested)
```

### Security

| Measure | Detail |
|---|---|
| Filename sanitisation | All path separators and shell-special chars stripped |
| Path traversal prevention | Resolved path verified to stay inside `LOCAL_STORAGE_PATH` |
| User ownership check | Download/delete endpoints verify `user_id` against Cloudant metadata |
| Size limit | Enforced server-side via `MAX_UPLOAD_MB` (default 50 MB) |

### Metadata in IBM Cloudant

Every uploaded PDF and generated report has a metadata document in Cloudant:

**PDF record (`uploaded_pdf` type):**
```json
{
  "type": "uploaded_pdf",
  "user_id": "...",
  "file_id": "uuid",
  "filename": "paper.pdf",
  "stored_name": "uuid_paper.pdf",
  "local_path": "uploads/research_papers/user/uuid_paper.pdf",
  "size_bytes": 1234567,
  "uploaded_at": "2026-11-05T..."
}
```

**Report record (`report` type):**
```json
{
  "type": "report",
  "user_id": "...",
  "topic": "Machine Learning in Medicine",
  "content": "# Full markdown content ...",
  "references": [...],
  "file_metadata": {
    "file_id": "uuid",
    "filename": "uuid_Machine_Learning.md",
    "local_path": "uploads/generated_reports/user/uuid_Machine_Learning.md",
    "format": "md",
    "size_bytes": 8192
  }
}
```

### API Endpoints (new)

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/summarizer/upload` | POST | Upload PDF → save locally + Cloudant metadata + IBM Granite summary |
| `/api/v1/summarizer/uploads` | GET | List all uploaded PDFs for a user |
| `/api/v1/summarizer/download/pdf/{file_id}` | GET | Download uploaded PDF (auth check) |
| `/api/v1/summarizer/upload/{file_id}` | DELETE | Delete PDF from disk + Cloudant |
| `/api/v1/summarizer/download/summary` | POST | Download summary as Markdown |
| `/api/v1/reports/generate` | POST | Generate report → save locally (.md or .docx) + Cloudant |
| `/api/v1/reports/{id}/download?fmt=md` | GET | Download report as Markdown |
| `/api/v1/reports/{id}/download?fmt=docx` | GET | Download report as Word document |
| `/api/v1/reports/{id}` | DELETE | Delete report file + Cloudant record |

---

## 🔬 Core Features

### A. Intelligent Research Search
- IBM Granite enhances natural-language research queries
- Simultaneous search across OpenAlex, arXiv, and Crossref
- Filters: year range, domain; save papers to library

### B. AI Research Assistant
- Conversational IBM Granite 3 interface
- Chat history persisted in IBM Cloudant
- Explains concepts, suggests research directions

### C. Research Paper Summarizer
- PDF upload with drag-and-drop
- **PDF saved to local disk** (`uploads/research_papers/`)
- Metadata (file_id, size, path) stored in IBM Cloudant
- IBM Granite generates 7-section structured summary
- Download summary as Markdown

### D. Research Gap Analyzer
- IBM Granite analyses literature to identify unexplored areas
- Auto-mode: search + IBM Granite analysis in one click

### E. Hypothesis Generator
- Full pipeline: Topic → Papers → Gaps → Hypotheses with IBM Granite
- Primary (H1), Alternative (H2–H4), and Null (H0) hypotheses

### F. Research Report Generator
- IBM Granite generates a 9-section academic report
- **Report saved locally** as `.md` and/or `.docx`
- File metadata stored in IBM Cloudant
- Download as Markdown **or Word document**

### G. Reference Manager
- APA 7th, MLA 9th, IEEE, BibTeX citations
- Bulk BibTeX export

---

## 🌐 Full API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/search?q=...` | GET | Search academic literature |
| `/api/v1/search/save` | POST | Save paper to library |
| `/api/v1/chat` | POST | IBM Granite AI chat |
| `/api/v1/summarizer/upload` | POST | Upload PDF (local storage) + IBM Granite summary |
| `/api/v1/summarizer/uploads` | GET | List uploaded PDFs |
| `/api/v1/summarizer/download/pdf/{id}` | GET | Download PDF |
| `/api/v1/gaps/analyze` | POST | IBM Granite research gap analysis |
| `/api/v1/hypotheses/generate` | POST | IBM Granite hypothesis generation |
| `/api/v1/reports/generate` | POST | IBM Granite report + local file save |
| `/api/v1/reports/{id}/download?fmt=md` | GET | Download report (.md) |
| `/api/v1/reports/{id}/download?fmt=docx` | GET | Download report (.docx) |
| `/api/v1/references` | GET | Get all references |
| `/api/v1/references/save` | POST | Save reference |
| `/api/v1/dashboard/stats` | GET | Stats + local storage info |

Full interactive docs: http://localhost:8000/api/docs

---

## 📋 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `IBM_API_KEY` | Yes (AI) | IBM Cloud API key |
| `WATSONX_PROJECT_ID` | Yes (AI) | watsonx.ai project ID |
| `WATSONX_URL` | No | Default: `https://us-south.ml.cloud.ibm.com` |
| `GRANITE_MODEL_ID` | No | Default: `ibm/granite-3-8b-instruct` |
| `CLOUDANT_URL` | No | IBM Cloudant service URL |
| `CLOUDANT_APIKEY` | No | IBM Cloudant API key |
| `LOCAL_STORAGE_PATH` | No | Default: `uploads` (relative to `backend/`) |
| `MAX_UPLOAD_MB` | No | Default: `50` |
| `DEMO_MODE` | No | `true` forces demo mode |
| `SECRET_KEY` | Yes | JWT signing secret |

> **Removed:** `COS_API_KEY`, `COS_INSTANCE_CRN`, `COS_ENDPOINT`, `COS_BUCKET_PDFS`, `COS_BUCKET_REPORTS` — IBM Cloud Object Storage is no longer used.

---

## 🏗️ Architecture

- **AI Layer**: `GraniteService` — IAM token refresh, prompt engineering, watsonx.ai REST API
- **Database**: `CloudantService` — Cloudant HTTP API; graceful fallback to in-memory when unconfigured
- **Storage**: `LocalStorageService` — path-traversal-safe local disk storage; `_markdown_to_docx()` for Word export
- **Search**: Parallel async search across OpenAlex, arXiv, Crossref
- **Frontend**: React + TypeScript SPA; all API calls in `services/api.ts`

---

## 📝 Internship Compliance

| Requirement | Status | Implementation |
|---|---|---|
| IBM Granite for NLP | ✅ | `granite_service.py` — all 6 AI tasks |
| IBM watsonx.ai | ✅ | REST API with IAM auth + token refresh |
| IBM Cloudant | ✅ | `cloudant_service.py` — all persistence + file metadata |
| Document Storage | ✅ | `local_storage_service.py` — no COS subscription required |
| Python FastAPI | ✅ | Full REST API with OpenAPI docs |
| React + TypeScript | ✅ | SPA with 11 pages |
| Tailwind CSS | ✅ | Dark navy professional UI |
| Real research APIs | ✅ | OpenAlex + arXiv + Crossref |
| 6 core modules | ✅ | All implemented |
| Report generation | ✅ | 9-section reports; .md and .docx download |
| Citation management | ✅ | APA / MLA / IEEE / BibTeX export |
| PDF summarisation | ✅ | Local storage + PyMuPDF + IBM Granite |
| Research gaps | ✅ | IBM Granite analysis |
| Hypothesis generation | ✅ | H0/H1/H2/H3/H4 with methodology |

---

*Built for the AICTE–IBM SkillsBuild Internship Program*
