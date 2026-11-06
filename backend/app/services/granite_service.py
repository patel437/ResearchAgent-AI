"""
IBM Granite / watsonx.ai service.

Supports TWO watsonx.ai inference APIs automatically based on model ID:

  /ml/v1/text/generation  (version 2023-05-29)
      → Legacy Granite models: ibm/granite-3-8b-instruct,
        ibm/granite-13b-instruct-v2, ibm/granite-7b-lab, etc.

  /ml/v1/text/chat        (version 2024-05-31)
      → Granite 4.x models:  ibm/granite-4-h-small, ibm/granite-4-h-medium,
        ibm-granite/granite-4.0-tiny-preview, ibm-granite/granite-4.0-h-small,
        ibm-granite/granite-4.0-h-medium, ibm-granite/granite-4.0-8b-instruct,
        etc.
      → Also used by: meta-llama/*, mistralai/* on watsonx

The correct endpoint is selected automatically from GRANITE_MODEL_ID.
"""
import json
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"

# Models that use the CHAT endpoint (/ml/v1/text/chat)
# Prefix-match: any model whose ID starts with one of these uses chat API.
_CHAT_API_PREFIXES = (
    "ibm/granite-4",            # ibm/granite-4-h-small, ibm/granite-4-h-medium, etc.
    "ibm-granite/granite-4",    # ibm-granite/granite-4.0-* (old prefix)
    "ibm-granite/granite-3",    # granite-3.x series on new endpoint
    "meta-llama/",
    "mistralai/",
    "google/",
    "microsoft/",
)

SYSTEM_PROMPT_RESEARCHER = (
    "You are ResearchAgent AI, an expert academic research assistant powered by IBM Granite. "
    "You help researchers find literature, understand complex topics, identify research gaps, "
    "generate hypotheses, and prepare research reports. Always be accurate, cite sources when "
    "available, and clearly distinguish AI-generated suggestions from verified findings. "
    "Format your responses in clear, structured markdown."
)


def _uses_chat_api(model_id: str) -> bool:
    """Return True if this model should use /ml/v1/text/chat instead of /ml/v1/text/generation."""
    m = model_id.lower()
    return any(m.startswith(p.lower()) for p in _CHAT_API_PREFIXES)


class GraniteService:
    """Handles all interactions with IBM watsonx.ai / Granite models."""

    def __init__(self):
        self._access_token: Optional[str] = None
        self._token_expiry: float = 0.0

    # ── Authentication ─────────────────────────────────────────────
    async def _get_access_token(self) -> str:
        import time

        if self._access_token and time.time() < self._token_expiry - 60:
            return self._access_token

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                IAM_TOKEN_URL,
                data={
                    "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                    "apikey": settings.IBM_API_KEY,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
            self._access_token = data["access_token"]
            self._token_expiry = time.time() + data.get("expires_in", 3600)
            return self._access_token

    # ── Error helpers ───────────────────────────────────────────────
    def _raise_for_status(self, resp: httpx.Response) -> None:
        """Raise a descriptive RuntimeError for 4xx responses."""
        if resp.status_code == 401:
            raise RuntimeError(
                "IBM watsonx.ai returned 401 Unauthorized.\n"
                "Your IBM_API_KEY is invalid or has been revoked.\n"
                "Fix: Regenerate it at https://cloud.ibm.com/iam/apikeys"
            )
        if resp.status_code == 403:
            body = ""
            try:
                body = resp.json().get("message", resp.text[:300])
            except Exception:
                body = resp.text[:300]
            raise RuntimeError(
                "IBM watsonx.ai returned 403 Forbidden.\n"
                "Your API key reached IBM IAM (token obtained) but cannot call Watson Machine Learning.\n"
                "Fix steps:\n"
                "1. Open your watsonx.ai project → Manage tab → Services & integrations\n"
                "   → confirm 'Watson Machine Learning' is listed.\n"
                "2. IBM Cloud → IAM → Access groups / Policies → confirm the key has\n"
                "   'Editor' or 'Manager' role on Watson Machine Learning.\n"
                "3. Verify WATSONX_PROJECT_ID in .env matches the UUID in the project URL.\n"
                f"IBM raw error: {body}"
            )
        if resp.status_code == 404:
            raise RuntimeError(
                f"IBM watsonx.ai returned 404 Not Found for model '{settings.GRANITE_MODEL_ID}'.\n"
                "Fix: Check that GRANITE_MODEL_ID in .env is a valid watsonx.ai model ID.\n"
                "The ID in your .env is read correctly and the correct API endpoint is chosen.\n"
                "If this model is new, ensure your watsonx.ai region supports it.\n"
                f"Current WATSONX_URL: {settings.WATSONX_URL}"
            )
        resp.raise_for_status()

    # ── Chat API (/ml/v1/text/chat) ─────────────────────────────────
    async def _generate_via_chat_api(
        self,
        system_prompt: str,
        user_prompt: str,
        max_new_tokens: int,
        temperature: float,
    ) -> str:
        """
        Call /ml/v1/text/chat — used by Granite 4.x and other modern models.
        https://ibm.github.io/watson-machine-learning-sdk/
        """
        token = await self._get_access_token()
        url = f"{settings.WATSONX_URL}/ml/v1/text/chat?version=2024-05-31"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model_id": settings.GRANITE_MODEL_ID,
            "messages": messages,
            "parameters": {
                "max_tokens": max_new_tokens,
                "temperature": temperature,
            },
            "project_id": settings.WATSONX_PROJECT_ID,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
            self._raise_for_status(resp)
            result = resp.json()
            # Chat API response: choices[0].message.content
            text = result["choices"][0]["message"]["content"].strip()
            logger.info(
                "Granite chat response: model=%s tokens=%s",
                settings.GRANITE_MODEL_ID,
                result.get("usage", {}).get("completion_tokens", "?"),
            )
            return text

    # ── Generation API (/ml/v1/text/generation) ─────────────────────
    async def _generate_via_generation_api(
        self,
        system_prompt: str,
        user_prompt: str,
        max_new_tokens: int,
        temperature: float,
        repetition_penalty: float,
    ) -> str:
        """
        Call /ml/v1/text/generation — used by legacy Granite 3.x instruct models.
        """
        token = await self._get_access_token()
        url = f"{settings.WATSONX_URL}/ml/v1/text/generation?version=2023-05-29"

        if system_prompt:
            full_prompt = (
                f"<|system|>\n{system_prompt}\n"
                f"<|user|>\n{user_prompt}\n"
                f"<|assistant|>\n"
            )
        else:
            full_prompt = user_prompt

        payload = {
            "model_id": settings.GRANITE_MODEL_ID,
            "input": full_prompt,
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": max_new_tokens,
                "repetition_penalty": repetition_penalty,
                "temperature": temperature,
            },
            "project_id": settings.WATSONX_PROJECT_ID,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
            self._raise_for_status(resp)
            result = resp.json()
            text = result["results"][0]["generated_text"].strip()
            logger.info(
                "Granite generation response: model=%s tokens=%d",
                settings.GRANITE_MODEL_ID,
                result["results"][0].get("generated_token_count", 0),
            )
            return text

    # ── Unified entry point ─────────────────────────────────────────
    async def generate(
        self,
        prompt: str,
        system_prompt: str = SYSTEM_PROMPT_RESEARCHER,
        max_new_tokens: int = 1024,
        temperature: float = 0.7,
        repetition_penalty: float = 1.1,
    ) -> str:
        """
        Route to the correct watsonx.ai API based on GRANITE_MODEL_ID.
        Granite 4.x  → /ml/v1/text/chat
        Granite 3.x legacy → /ml/v1/text/generation
        """
        if settings.is_demo:
            return self._demo_response(prompt)

        use_chat = _uses_chat_api(settings.GRANITE_MODEL_ID)
        logger.debug("model=%s use_chat_api=%s", settings.GRANITE_MODEL_ID, use_chat)

        if use_chat:
            return await self._generate_via_chat_api(
                system_prompt=system_prompt,
                user_prompt=prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
            )
        else:
            return await self._generate_via_generation_api(
                system_prompt=system_prompt,
                user_prompt=prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                repetition_penalty=repetition_penalty,
            )

    # ── Conversational chat ─────────────────────────────────────────
    async def chat(self, message: str, history: list[dict]) -> str:
        """Handle conversational research chat with history."""
        if settings.is_demo:
            return self._demo_chat_response(message)

        system = (
            "You are ResearchAgent AI, an expert academic research assistant. "
            "Answer research questions thoroughly, explain complex concepts clearly, "
            "suggest relevant research directions, and cite sources when available. "
            "Use markdown formatting for structured responses."
        )

        use_chat = _uses_chat_api(settings.GRANITE_MODEL_ID)

        if use_chat:
            # Build messages list with history for chat API
            token = await self._get_access_token()
            url = f"{settings.WATSONX_URL}/ml/v1/text/chat?version=2024-05-31"

            messages: list[dict] = [{"role": "system", "content": system}]
            for turn in history[-6:]:
                role = turn.get("role", "user")
                content = turn.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})
            messages.append({"role": "user", "content": message})

            payload = {
                "model_id": settings.GRANITE_MODEL_ID,
                "messages": messages,
                "parameters": {"max_tokens": 1024, "temperature": 0.7},
                "project_id": settings.WATSONX_PROJECT_ID,
            }

            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )
                self._raise_for_status(resp)
                return resp.json()["choices"][0]["message"]["content"].strip()

        else:
            # Legacy generation API with token-formatted prompt
            context = ""
            for turn in history[-6:]:
                role = turn.get("role", "user")
                content = turn.get("content", "")
                context += f"<|{role}|>\n{content}\n"
            full_input = (
                f"<|system|>\n{system}\n"
                f"{context}"
                f"<|user|>\n{message}\n"
                f"<|assistant|>\n"
            )
            return await self._generate_via_generation_api(
                system_prompt="",
                user_prompt=full_input,
                max_new_tokens=1024,
                temperature=0.7,
                repetition_penalty=1.1,
            )

    # ── High-level AI tasks ─────────────────────────────────────────
    async def understand_research_query(self, query: str) -> dict:
        prompt = f"""Analyze this research query and extract structured information.
Research Query: "{query}"

Return a JSON object with these exact fields:
{{
  "main_topic": "...",
  "keywords": ["kw1", "kw2", "kw3"],
  "domain": "...",
  "research_intent": "...",
  "suggested_search_terms": ["term1", "term2"]
}}"""
        text = await self.generate(prompt, max_new_tokens=512, temperature=0.3)
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            return json.loads(text[start:end])
        except Exception:
            return {
                "main_topic": query,
                "keywords": query.split()[:5],
                "domain": "General Research",
                "research_intent": query,
                "suggested_search_terms": [query],
            }

    async def summarize_paper(self, text: str, title: str = "") -> dict:
        truncated = text[:12000] if len(text) > 12000 else text
        prompt = f"""You are a research paper analyst. Analyze the following paper and provide a structured summary.

Paper Title: {title or 'Unknown'}

Paper Content:
{truncated}

Provide a comprehensive structured summary with these EXACT sections:
1. **Research Objective**: What is the main goal of this research?
2. **Problem Statement**: What problem does it address?
3. **Methodology**: What methods/approaches were used?
4. **Dataset**: What data was used (if applicable)?
5. **Key Findings**: What are the main results and contributions?
6. **Limitations**: What are the limitations acknowledged?
7. **Future Scope**: What future work is suggested?

Be concise but thorough. Use markdown formatting."""
        return {"summary": await self.generate(prompt, max_new_tokens=1500, temperature=0.4)}

    async def identify_research_gaps(self, papers: list[dict], topic: str) -> dict:
        paper_summaries = "\n\n".join(
            [
                f"Paper {i+1}: {p.get('title', 'Unknown')}\n"
                f"Abstract: {p.get('abstract', 'N/A')[:500]}"
                for i, p in enumerate(papers[:10])
            ]
        )
        prompt = f"""As an expert research analyst, analyze these research papers on "{topic}" and identify research gaps.

Research Papers:
{paper_summaries}

Provide a comprehensive analysis with these sections:
1. **Current Research Landscape**: Overview of what has been studied
2. **Identified Research Gaps**: Specific unexplored areas (list at least 5)
3. **Unexplored Methodologies**: Approaches not yet applied to this domain
4. **Emerging Research Directions**: New areas worth investigating
5. **Interdisciplinary Opportunities**: Cross-domain research possibilities
6. **Suggested Research Questions**: 5 specific research questions

⚠️ Note: These are AI-generated suggestions based on the provided papers. Always validate with domain experts.

Use markdown formatting with clear sections."""
        return {"gaps": await self.generate(prompt, max_new_tokens=1800, temperature=0.7)}

    async def generate_hypotheses(self, topic: str, gaps: str, papers: list[dict]) -> dict:
        paper_context = "\n".join(
            [f"- {p.get('title', 'Unknown')} ({p.get('year', 'N/A')})" for p in papers[:8]]
        )
        prompt = f"""As a research scientist, generate comprehensive hypotheses for the research topic below.

Research Topic: {topic}
Identified Research Gaps: {gaps[:2000] if len(gaps) > 2000 else gaps}

Supporting Papers:
{paper_context}

Generate the following:
1. **Primary Hypothesis**: The main testable hypothesis (H1)
2. **Alternative Hypotheses**: 3 alternative hypotheses (H2, H3, H4)
3. **Null Hypothesis**: The null hypothesis (H0) for the primary
4. **Research Questions**: 5 specific research questions derived from hypotheses
5. **Suggested Methodologies**: 3 appropriate research methodologies with justification
6. **Variables**: Independent, dependent, and control variables

⚠️ These are AI-generated hypotheses for academic exploration. Validate with domain experts before conducting research.

Use clear markdown formatting."""
        return {"hypotheses": await self.generate(prompt, max_new_tokens=1800, temperature=0.8)}

    async def generate_report(
        self, topic: str, papers: list[dict], additional_context: str = ""
    ) -> dict:
        refs = "\n".join(
            [
                f"[{i+1}] {p.get('title','Unknown')} - "
                f"{', '.join(p.get('authors',[])[:2])} ({p.get('year','N/A')}). "
                f"DOI: {p.get('doi','N/A')}"
                for i, p in enumerate(papers[:15])
            ]
        )
        abstracts = "\n\n".join(
            [
                f"**{p.get('title','Unknown')} ({p.get('year','N/A')})**\n"
                f"{p.get('abstract','N/A')[:400]}"
                for p in papers[:8]
            ]
        )
        prompt = f"""Write a comprehensive academic research report on the following topic.

Research Topic: {topic}
{f"Additional Context: {additional_context}" if additional_context else ""}

Available Literature:
{abstracts}

Write a full research report with these EXACT sections:

# {topic}: A Comprehensive Research Report

## Abstract
[250-word abstract summarizing the entire report]

## 1. Introduction
[Background, motivation, and scope of the research - 3 paragraphs]

## 2. Literature Review
[Synthesize findings from the provided papers, cite them as [1], [2], etc. - 4 paragraphs]

## 3. Research Methodology
[Propose appropriate research methodology and approach - 2 paragraphs]

## 4. Key Findings and Analysis
[Synthesize key findings from reviewed literature - 3 paragraphs]

## 5. Research Gaps Identified
[Identify gaps in current literature - numbered list]

## 6. Conclusion
[Summarize contributions and future directions - 2 paragraphs]

## References
{refs}

---
*Generated by ResearchAgent AI using IBM Granite. Verify all citations before academic submission.*"""
        return {"report": await self.generate(prompt, max_new_tokens=3000, temperature=0.6)}

    # ── Connection test ─────────────────────────────────────────────
    async def test_connection(self) -> dict:
        """Send a minimal prompt and return structured pass/fail with fix instructions."""
        if settings.is_demo:
            return {
                "success": False,
                "error": "Credentials not configured (demo mode)",
                "fix": "Set IBM_API_KEY and WATSONX_PROJECT_ID in backend/.env",
            }

        # Stage 1: IAM token
        try:
            token = await self._get_access_token()
        except Exception as exc:
            return {
                "success": False,
                "stage": "iam_token",
                "error": str(exc),
                "fix": "IBM_API_KEY is invalid or expired. Regenerate it at https://cloud.ibm.com/iam/apikeys",
            }

        use_chat = _uses_chat_api(settings.GRANITE_MODEL_ID)
        api_type = "chat" if use_chat else "generation"

        # Stage 2: Generation
        try:
            if use_chat:
                url = f"{settings.WATSONX_URL}/ml/v1/text/chat?version=2024-05-31"
                payload = {
                    "model_id": settings.GRANITE_MODEL_ID,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": "Reply with exactly: IBM Granite connection OK"},
                    ],
                    "parameters": {"max_tokens": 20, "temperature": 0},
                    "project_id": settings.WATSONX_PROJECT_ID,
                }
            else:
                url = f"{settings.WATSONX_URL}/ml/v1/text/generation?version=2023-05-29"
                payload = {
                    "model_id": settings.GRANITE_MODEL_ID,
                    "input": "<|user|>\nReply: IBM Granite connection OK\n<|assistant|>\n",
                    "parameters": {"decoding_method": "greedy", "max_new_tokens": 20},
                    "project_id": settings.WATSONX_PROJECT_ID,
                }

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                if resp.status_code == 403:
                    body = ""
                    try:
                        body = resp.json().get("message", "")
                    except Exception:
                        body = resp.text[:200]
                    return {
                        "success": False,
                        "stage": "generation",
                        "http_status": 403,
                        "api_type": api_type,
                        "ibm_error": body,
                        "fix": (
                            "403 Forbidden — IAM token obtained but Watson Machine Learning call blocked.\n"
                            "① watsonx.ai project → Manage → Services & integrations\n"
                            "   → associate 'Watson Machine Learning' instance.\n"
                            "② IBM Cloud → IAM → confirm API key has Editor/Manager role\n"
                            "   on Watson Machine Learning.\n"
                            "③ Verify WATSONX_PROJECT_ID in .env matches the UUID in the project URL."
                        ),
                    }

                if resp.status_code == 404:
                    return {
                        "success": False,
                        "stage": "generation",
                        "http_status": 404,
                        "api_type": api_type,
                        "model_tried": settings.GRANITE_MODEL_ID,
                        "fix": (
                            f"404 Not Found — model '{settings.GRANITE_MODEL_ID}' not available "
                            f"in this region.\n"
                            f"API used: {url}\n"
                            "Check model availability at:\n"
                            "https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/"
                            "fm-models.html"
                        ),
                    }

                self._raise_for_status(resp)

                if use_chat:
                    text = resp.json()["choices"][0]["message"]["content"].strip()
                else:
                    text = resp.json()["results"][0]["generated_text"].strip()

                return {
                    "success": True,
                    "model": settings.GRANITE_MODEL_ID,
                    "api_type": api_type,
                    "url": settings.WATSONX_URL,
                    "project_id_prefix": (settings.WATSONX_PROJECT_ID or "")[:8] + "…",
                    "response_preview": text[:80],
                }

        except RuntimeError as exc:
            return {"success": False, "stage": "generation", "api_type": api_type, "error": str(exc)}
        except Exception as exc:
            return {"success": False, "stage": "generation", "api_type": api_type, "error": str(exc)}

    # ── Demo mode responses ─────────────────────────────────────────
    def _demo_response(self, prompt: str) -> str:
        return (
            "**[DEMO MODE — IBM Granite not configured]**\n\n"
            "To enable real IBM Granite AI responses:\n\n"
            "1. Set `IBM_API_KEY` in `backend/.env`\n"
            "2. Set `WATSONX_PROJECT_ID` in `backend/.env`\n"
            "3. Set `DEMO_MODE=false`\n\n"
            "See Settings → IBM Granite Connection Test."
        )

    def _demo_chat_response(self, message: str) -> str:
        return (
            "**[DEMO MODE]** Configure IBM watsonx.ai credentials to enable IBM Granite.\n\n"
            "I can help with:\n"
            "- 🔍 **Literature Search** — real papers from OpenAlex, arXiv, Crossref\n"
            "- 📄 **Paper Summarisation** — upload PDFs for AI analysis\n"
            "- 🔬 **Research Gap Analysis** — identify unexplored areas\n"
            "- 💡 **Hypothesis Generation** — generate testable hypotheses\n"
            "- 📊 **Report Generation** — create structured research reports\n"
        )


# Singleton instance
granite_service = GraniteService()
