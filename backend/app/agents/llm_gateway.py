import os
import time
import json
import uuid
import asyncio
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Type, TypeVar
import httpx
import aiosqlite
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.logging import logger
from app.core.errors import AppError
from app.db.database import get_db_path

T = TypeVar("T", bound=BaseModel)

class LLMGateway:
    _cached_iam_token: Optional[str] = None
    _cached_iam_expires_at: float = 0.0

    @classmethod
    def is_configured(cls) -> bool:
        provider = settings.LLM_PROVIDER.lower()
        if provider == "mock":
            return True
        if provider in ["watsonx", "ibm"]:
            return bool(settings.WATSONX_API_KEY and settings.WATSONX_PROJECT_ID)
        if provider == "openai":
            return bool(settings.OPENAI_API_KEY or "localhost" in settings.OPENAI_BASE_URL)
        if provider == "anthropic":
            return bool(settings.ANTHROPIC_API_KEY)
        if provider in ["huggingface", "hf"]:
            return bool(settings.HUGGINGFACE_API_KEY or "localhost" in settings.HUGGINGFACE_BASE_URL)
        return False
    """
    LLM Gateway abstraction layer supporting Mock, IBM watsonx.ai, OpenAI (or OpenAI-compatible, Ollama),
    Anthropic Messages API, and Hugging Face Inference API / router, with token budget tracking.
    """

    @staticmethod
    def get_role_model(role: Optional[str] = None) -> str:
        provider = settings.LLM_PROVIDER.lower()
        if provider in ["watsonx", "ibm"]:
            if role == "builder" and settings.LLM_BUILDER_MODEL and "gpt" not in settings.LLM_BUILDER_MODEL:
                return settings.LLM_BUILDER_MODEL
            if role == "adversary" and settings.LLM_ADVERSARY_MODEL and "gpt" not in settings.LLM_ADVERSARY_MODEL:
                return settings.LLM_ADVERSARY_MODEL
            if role == "reviewer" and settings.LLM_REVIEWER_MODEL and "gpt" not in settings.LLM_REVIEWER_MODEL:
                return settings.LLM_REVIEWER_MODEL
            return settings.WATSONX_DEFAULT_MODEL

        if role == "builder" and settings.LLM_BUILDER_MODEL:
            return settings.LLM_BUILDER_MODEL
        if role == "adversary" and settings.LLM_ADVERSARY_MODEL:
            return settings.LLM_ADVERSARY_MODEL
        if role == "reviewer" and settings.LLM_REVIEWER_MODEL:
            return settings.LLM_REVIEWER_MODEL
        return settings.LLM_DEFAULT_MODEL

    @staticmethod
    def get_system_prompt(role: str) -> str:
        prompts_dir = Path(__file__).parent / "prompts"
        safety_path = prompts_dir / "safety.txt"
        role_path = prompts_dir / f"{role}.txt"

        safety_text = safety_path.read_text(encoding="utf-8") if safety_path.exists() else ""
        role_text = role_path.read_text(encoding="utf-8") if role_path.exists() else ""

        return f"{safety_text}\n\n{role_text}".strip()

    @classmethod
    async def generate_chat(
        cls,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        role: Optional[str] = None,
        temperature: float = 0.2,
        response_format: Optional[Dict[str, str]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        target_model = model or cls.get_role_model(role)
        provider = settings.LLM_PROVIDER.lower()

        # 1. Explicit Mock Provider
        if provider == "mock":
            logger.info("Using LLM Mock Provider")
            res = cls._mock_response(messages, target_model, role=role)
            res["mode"] = "mock"
            return res

        # 2. Live Providers
        if provider == "openai":
            if not settings.OPENAI_API_KEY and "localhost" not in settings.OPENAI_BASE_URL:
                raise AppError(
                    "OPENAI_API_KEY is not configured",
                    code="LLM_NOT_CONFIGURED",
                    status_code=500
                )
            res = await cls._call_openai(messages, target_model, temperature, response_format)
            res["mode"] = "live"
            await cls._record_usage(
                target_model, "openai", res.get("input_tokens", 0), res.get("output_tokens", 0), session_id
            )
            return res

        if provider == "anthropic":
            if not settings.ANTHROPIC_API_KEY:
                raise AppError(
                    "ANTHROPIC_API_KEY is not configured",
                    code="LLM_NOT_CONFIGURED",
                    status_code=500
                )
            res = await cls._call_anthropic(messages, target_model, temperature)
            res["mode"] = "live"
            await cls._record_usage(
                target_model, "anthropic", res.get("input_tokens", 0), res.get("output_tokens", 0), session_id
            )
            return res

        if provider in ["huggingface", "hf"]:
            if not settings.HUGGINGFACE_API_KEY and "localhost" not in settings.HUGGINGFACE_BASE_URL:
                raise AppError(
                    "HUGGINGFACE_API_KEY is not configured",
                    code="LLM_NOT_CONFIGURED",
                    status_code=500
                )
            res = await cls._call_huggingface(messages, target_model, temperature, response_format)
            res["mode"] = "live"
            await cls._record_usage(
                target_model, "huggingface", res.get("input_tokens", 0), res.get("output_tokens", 0), session_id
            )
            return res

        if provider in ["watsonx", "ibm"]:
            if not settings.WATSONX_API_KEY or not settings.WATSONX_PROJECT_ID:
                raise AppError(
                    "WATSONX_API_KEY and WATSONX_PROJECT_ID are not configured",
                    code="LLM_NOT_CONFIGURED",
                    status_code=500
                )
            res = await cls._call_watsonx(messages, target_model, temperature, response_format)
            res["mode"] = "live"
            await cls._record_usage(
                target_model, "watsonx", res.get("input_tokens", 0), res.get("output_tokens", 0), session_id
            )
            return res

        raise AppError(
            f"Unsupported LLM provider '{settings.LLM_PROVIDER}'",
            code="INVALID_LLM_PROVIDER",
            status_code=400
        )

    @classmethod
    async def generate_structured(
        cls,
        messages: List[Dict[str, str]],
        response_model: Type[T],
        model: Optional[str] = None,
        role: Optional[str] = None,
        temperature: float = 0.1,
        session_id: Optional[str] = None
    ) -> T:
        """
        Generates chat completion and validates against a Pydantic model.
        Retries once with validation feedback on parse error.
        """
        resp = await cls.generate_chat(
            messages,
            model=model,
            role=role,
            temperature=temperature,
            response_format={"type": "json_object"} if settings.LLM_PROVIDER == "openai" else None,
            session_id=session_id
        )
        raw_text = resp["content"].strip()
        
        # Strip markdown fences if present
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        try:
            data = json.loads(raw_text)
            return response_model.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as err:
            logger.warning(f"Structured output validation failed: {err}. Retrying once with error feedback...")
            retry_messages = list(messages) + [
                {"role": "assistant", "content": resp["content"]},
                {
                    "role": "user",
                    "content": f"The response was not valid JSON conforming to the schema. Error: {str(err)}. Return ONLY valid JSON."
                }
            ]
            resp_retry = await cls.generate_chat(
                retry_messages,
                model=model,
                role=role,
                temperature=temperature,
                session_id=session_id
            )
            clean_retry = resp_retry["content"].strip()
            if clean_retry.startswith("```json"):
                clean_retry = clean_retry[7:]
            elif clean_retry.startswith("```"):
                clean_retry = clean_retry[3:]
            if clean_retry.endswith("```"):
                clean_retry = clean_retry[:-3]
            data_retry = json.loads(clean_retry.strip())
            return response_model.model_validate(data_retry)

    @classmethod
    async def embed_text(
        cls,
        texts: List[str],
        model: Optional[str] = None
    ) -> List[List[float]]:
        """
        Generates dense vector embeddings using configured provider (Hugging Face / OpenAI / fallback).
        """
        provider = settings.LLM_PROVIDER.lower()
        if not texts:
            return []

        # 1. Hugging Face Feature Extraction / Embeddings
        if provider in ["huggingface", "hf"] and (settings.HUGGINGFACE_API_KEY or "localhost" in settings.HUGGINGFACE_BASE_URL):
            hf_model = model or "sentence-transformers/all-MiniLM-L6-v2"
            headers = {
                "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
                "Content-Type": "application/json"
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        f"{settings.HUGGINGFACE_BASE_URL}/embeddings",
                        headers=headers,
                        json={"model": hf_model, "input": texts}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        if "data" in data and isinstance(data["data"], list):
                            return [item["embedding"] for item in data["data"]]
            except Exception as e:
                logger.debug(f"HF embeddings endpoint fallback: {e}")

        # 2. OpenAI Embeddings
        if provider == "openai" and (settings.OPENAI_API_KEY or "localhost" in settings.OPENAI_BASE_URL):
            target_model = model or "text-embedding-3-small"
            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        f"{settings.OPENAI_BASE_URL}/embeddings",
                        headers=headers,
                        json={"model": target_model, "input": texts}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return [item["embedding"] for item in data.get("data", [])]
            except Exception as e:
                logger.debug(f"OpenAI embeddings endpoint fallback: {e}")

        # 3. IBM watsonx.ai Embeddings
        if provider in ["watsonx", "ibm"] and settings.WATSONX_API_KEY and settings.WATSONX_PROJECT_ID:
            emb_model = model or settings.WATSONX_EMBEDDING_MODEL
            try:
                token = await cls._get_iam_token()
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                base_url = settings.WATSONX_URL.rstrip("/")
                emb_url = f"{base_url}/ml/v1/text/embeddings?version={settings.WATSONX_VERSION}"
                payload = {
                    "model_id": emb_model,
                    "project_id": settings.WATSONX_PROJECT_ID,
                    "inputs": texts
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(emb_url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        results_list = data.get("results", [])
                        if results_list and "embedding" in results_list[0]:
                            return [item["embedding"] for item in results_list]
            except Exception as e:
                logger.debug(f"Watsonx embedding endpoint fallback: {e}")

        # 4. Deterministic Token-Hash Pseudo-Embedding Fallback (Offline / Mock Mode)
        # Generates a normalized 64-dimensional float vector based on sha256 term hashing
        results = []
        dim = 64
        for text in texts:
            vec = [0.0] * dim
            tokens = text.lower().split()
            if not tokens:
                results.append(vec)
                continue
            for tok in tokens:
                idx = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16) % dim
                vec[idx] += 1.0
            norm = (sum(x * x for x in vec)) ** 0.5
            if norm > 0:
                vec = [x / norm for x in vec]
            results.append(vec)
        return results

    @classmethod
    async def _get_iam_token(cls) -> str:
        """
        Retrieves or refreshes an IBM Cloud IAM bearer token using WATSONX_API_KEY.
        Caches the token until 60 seconds before expiration.
        """
        now = time.time()
        if cls._cached_iam_token and now < (cls._cached_iam_expires_at - 60):
            return cls._cached_iam_token

        if not settings.WATSONX_API_KEY:
            raise AppError(
                "WATSONX_API_KEY is not configured",
                code="LLM_NOT_CONFIGURED",
                status_code=500
            )

        token_url = "https://iam.cloud.ibm.com/identity/token"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": settings.WATSONX_API_KEY
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(token_url, headers=headers, data=data)
                if resp.status_code != 200:
                    logger.error(f"Failed to authenticate with IBM Cloud IAM: HTTP {resp.status_code}")
                    raise AppError(
                        "IBM Cloud authentication failed. Please verify your WATSONX_API_KEY.",
                        code="LLM_AUTH_FAILED",
                        status_code=401
                    )
                token_data = resp.json()
                token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 3600)
                if not token:
                    raise AppError(
                        "No access_token returned from IBM Cloud IAM",
                        code="LLM_AUTH_FAILED",
                        status_code=401
                    )
                cls._cached_iam_token = token
                cls._cached_iam_expires_at = now + float(expires_in)
                return token
        except AppError:
            raise
        except Exception as e:
            logger.error(f"Network error contacting IBM IAM: {e}")
            raise AppError(
                "Network error connecting to IBM Cloud authentication service.",
                code="LLM_NETWORK_ERROR",
                status_code=502
            )

    @classmethod
    async def _call_watsonx(
        cls,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        response_format: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Executes a chat completion via IBM watsonx.ai REST endpoints.
        Supports /ml/v1/text/chat and automatic text/generation fallback.
        """
        if not settings.WATSONX_PROJECT_ID:
            raise AppError(
                "WATSONX_PROJECT_ID is not configured",
                code="LLM_NOT_CONFIGURED",
                status_code=500
            )

        token = await cls._get_iam_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        base_url = settings.WATSONX_URL.rstrip("/")
        version = settings.WATSONX_VERSION
        chat_url = f"{base_url}/ml/v1/text/chat?version={version}"

        payload: Dict[str, Any] = {
            "model_id": model,
            "project_id": settings.WATSONX_PROJECT_ID,
            "messages": messages,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": 4096
            }
        }

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    resp = await client.post(chat_url, headers=headers, json=payload)

                    if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
                        await asyncio.sleep(2 ** attempt)
                        continue

                    # If 404 (endpoint differences), fallback to text/generation endpoint
                    if resp.status_code == 404 and attempt == 0:
                        alt_url = f"{base_url}/ml/v1/text/generation?version={version}"
                        prompt_str = "\n".join(f"{m['role'].capitalize()}: {m['content']}" for m in messages) + "\nAssistant:"
                        gen_payload = {
                            "model_id": model,
                            "project_id": settings.WATSONX_PROJECT_ID,
                            "input": prompt_str,
                            "parameters": {
                                "temperature": temperature,
                                "max_new_tokens": 4096
                            }
                        }
                        gen_resp = await client.post(alt_url, headers=headers, json=gen_payload)
                        if gen_resp.status_code == 200:
                            gen_data = gen_resp.json()
                            results = gen_data.get("results", [])
                            content = results[0].get("generated_text", "") if results else ""
                            input_tokens = gen_data.get("results", [{}])[0].get("input_token_count", 0)
                            output_tokens = gen_data.get("results", [{}])[0].get("generated_token_count", 0)
                            return {
                                "content": content,
                                "role": "assistant",
                                "model": model,
                                "input_tokens": input_tokens,
                                "output_tokens": output_tokens
                            }

                    if resp.status_code == 401 and attempt < 2:
                        cls._cached_iam_token = None
                        cls._cached_iam_expires_at = 0.0
                        token = await cls._get_iam_token()
                        headers["Authorization"] = f"Bearer {token}"
                        continue

                    resp.raise_for_status()
                    data = resp.json()

                    if "choices" in data and len(data["choices"]) > 0:
                        content = data["choices"][0].get("message", {}).get("content", "")
                    elif "results" in data and len(data["results"]) > 0:
                        content = data["results"][0].get("generated_text", "")
                    else:
                        content = str(data)

                    usage = data.get("usage", {})
                    return {
                        "content": content,
                        "role": "assistant",
                        "model": model,
                        "input_tokens": usage.get("prompt_tokens", 0) or usage.get("input_token_count", 0),
                        "output_tokens": usage.get("completion_tokens", 0) or usage.get("generated_token_count", 0)
                    }

            except httpx.HTTPStatusError as e:
                clean_err = e.response.text[:300]
                if attempt == 2:
                    raise AppError(
                        f"IBM watsonx.ai API error (HTTP {e.response.status_code}): {clean_err}",
                        code="LLM_API_ERROR",
                        status_code=502
                    )
            except Exception as exc:
                if attempt == 2:
                    raise AppError(
                        f"IBM watsonx.ai connection error: {exc}",
                        code="LLM_NETWORK_ERROR",
                        status_code=502
                    )
                await asyncio.sleep(1)

        raise AppError("IBM watsonx.ai call failed after retries", code="LLM_API_ERROR", status_code=502)


    @classmethod
    async def _call_openai(
        cls,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        response_format: Optional[Dict[str, str]]
    ) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        f"{settings.OPENAI_BASE_URL}/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    return {
                        "content": content,
                        "role": "assistant",
                        "model": model,
                        "input_tokens": usage.get("prompt_tokens", 0),
                        "output_tokens": usage.get("completion_tokens", 0)
                    }
            except httpx.HTTPStatusError as e:
                if attempt == 2:
                    raise AppError(f"OpenAI API error: {e.response.text}", code="LLM_API_ERROR", status_code=502)
            except Exception as exc:
                if attempt == 2:
                    raise AppError(f"OpenAI connection error: {exc}", code="LLM_NETWORK_ERROR", status_code=502)
                await asyncio.sleep(1)

        raise AppError("OpenAI call failed after retries", code="LLM_API_ERROR", status_code=502)

    @classmethod
    async def _call_anthropic(
        cls,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float
    ) -> Dict[str, Any]:
        system_content = ""
        anthropic_msgs = []
        for m in messages:
            if m["role"] == "system":
                system_content += m["content"] + "\n\n"
            else:
                anthropic_msgs.append({"role": m["role"], "content": m["content"]})

        headers = {
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": model,
            "messages": anthropic_msgs,
            "max_tokens": settings.LLM_MAX_TOKENS_PER_SESSION,
            "temperature": temperature
        }
        if system_content.strip():
            payload["system"] = system_content.strip()

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers=headers,
                        json=payload
                    )
                    if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["content"][0]["text"]
                    usage = data.get("usage", {})
                    return {
                        "content": content,
                        "role": "assistant",
                        "model": model,
                        "input_tokens": usage.get("input_tokens", 0),
                        "output_tokens": usage.get("output_tokens", 0)
                    }
            except httpx.HTTPStatusError as e:
                if attempt == 2:
                    raise AppError(f"Anthropic API error: {e.response.text}", code="LLM_API_ERROR", status_code=502)
            except Exception as exc:
                if attempt == 2:
                    raise AppError(f"Anthropic connection error: {exc}", code="LLM_NETWORK_ERROR", status_code=502)
                await asyncio.sleep(1)

        raise AppError("Anthropic call failed after retries", code="LLM_API_ERROR", status_code=502)

    @classmethod
    async def _call_huggingface(
        cls,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        response_format: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        hf_model = model if ("/" in model) else "Qwen/Qwen2.5-Coder-7B-Instruct"
        headers = {
            "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
            "Content-Type": "application/json"
        }
        payload: Dict[str, Any] = {
            "model": hf_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4096
        }
        if response_format:
            payload["response_format"] = response_format

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    resp = await client.post(
                        f"{settings.HUGGINGFACE_BASE_URL}/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    return {
                        "content": content,
                        "role": "assistant",
                        "model": hf_model,
                        "input_tokens": usage.get("prompt_tokens", 0),
                        "output_tokens": usage.get("completion_tokens", 0)
                    }
            except httpx.HTTPStatusError as e:
                if attempt == 2:
                    raise AppError(f"Hugging Face API error: {e.response.text}", code="LLM_API_ERROR", status_code=502)
            except Exception as exc:
                if attempt == 2:
                    raise AppError(f"Hugging Face connection error: {exc}", code="LLM_NETWORK_ERROR", status_code=502)
                await asyncio.sleep(1)

        raise AppError("Hugging Face call failed after retries", code="LLM_API_ERROR", status_code=502)

    @classmethod
    async def _record_usage(
        cls,
        model: str,
        provider: str,
        input_tokens: int,
        output_tokens: int,
        session_id: Optional[str] = None
    ) -> None:
        cost_usd = (input_tokens * 0.000003) + (output_tokens * 0.000015)
        db_path = get_db_path()
        try:
            async with aiosqlite.connect(db_path) as db:
                today_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                cursor = await db.execute(
                    "SELECT COALESCE(SUM(estimated_cost_usd), 0.0) FROM llm_usage WHERE created_at LIKE ?;",
                    (f"{today_prefix}%",)
                )
                row = await cursor.fetchone()
                daily_spend = row[0] if row else 0.0

                if daily_spend + cost_usd > settings.LLM_DAILY_BUDGET_USD:
                    raise AppError(
                        f"Daily LLM budget exceeded: ${daily_spend:.2f} + ${cost_usd:.4f} > ${settings.LLM_DAILY_BUDGET_USD:.2f}",
                        code="BUDGET_EXCEEDED",
                        status_code=429
                    )

                usage_id = f"usg_{uuid.uuid4().hex[:12]}"
                now_iso = datetime.now(timezone.utc).isoformat()
                await db.execute(
                    """
                    INSERT INTO llm_usage (id, session_id, model, provider, input_tokens, output_tokens, estimated_cost_usd, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (usage_id, session_id, model, provider, input_tokens, output_tokens, cost_usd, now_iso)
                )
                await db.commit()
        except AppError:
            raise
        except Exception as e:
            logger.warning(f"Could not record LLM usage in DB: {e}")

    @classmethod
    def _mock_response(
        cls,
        messages: List[Dict[str, str]],
        model: str,
        role: Optional[str] = None
    ) -> Dict[str, Any]:
        all_text = " ".join(m.get("content", "") for m in messages).lower()
        last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        lower_msg = last_user_msg.lower()

        if role == "builder" or "builder" in all_text or "file to update:" in all_text:
            if "test_calculator.py" in all_text:
                mock_content = """```python
import pytest
from calculator import Calculator

def test_add():
    c = Calculator()
    assert c.add(1, 2) == 3

def test_subtract():
    c = Calculator()
    assert c.subtract(5, 2) == 3

def test_multiply():
    c = Calculator()
    assert c.multiply(3, 4) == 12

def test_divide():
    c = Calculator()
    assert c.divide(10, 2) == 5

def test_divide_zero():
    c = Calculator()
    with pytest.raises(ValueError):
        c.divide(10, 0)
```"""
            elif "calculator.py" in all_text:
                mock_content = """```python
class Calculator:
    def __init__(self):
        self.history = []

    def add(self, a: float, b: float) -> float:
        res = a + b
        self.history.append(('add', a, b, res))
        return res

    def subtract(self, a: float, b: float) -> float:
        res = a - b
        self.history.append(('sub', a, b, res))
        return res

    def multiply(self, a: float, b: float) -> float:
        res = a * b
        self.history.append(('mul', a, b, res))
        return res

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError("Cannot divide by zero")
        res = a / b
        self.history.append(('div', a, b, res))
        return res
```"""
            elif "files_to_update" in all_text:
                mock_content = json.dumps({
                    "summary": "Implement requested feature and tests",
                    "files_touched": ["main.py"],
                    "files_to_update": {}
                })
            else:
                mock_content = "```python\n# Automated update applied by Parikshit Builder\n```"
        elif "overview" in all_text or "components" in all_text:
            mock_content = json.dumps({
                "components": [
                    {
                        "name": "Core Service",
                        "responsibility": "Primary domain business logic",
                        "files": ["main.py"],
                        "citations": []
                    },
                    {
                        "name": "Storage Engine",
                        "responsibility": "Data persistence and audit logging",
                        "files": ["database.py"],
                        "citations": []
                    }
                ],
                "relationships": [
                    {
                        "from": "Core Service",
                        "to": "Storage Engine",
                        "type": "call",
                        "citations": []
                    }
                ]
            })
        elif "adversary" in all_text or "suggested_test" in all_text:
            mock_content = json.dumps({
                "severity": "medium",
                "title": "Division by Zero & Edge Boundary",
                "description": "Validates proper exception handling on zero or empty inputs",
                "suggested_test": "test_adversarial_boundary",
                "test_code": "def test_adversarial_boundary():\n    assert True\n"
            })
        elif "heal" in all_text or "hypotheses" in all_text:
            mock_content = json.dumps({
                "hypotheses": [
                    {
                        "rank": 1,
                        "description": "Boundary edge condition not handled",
                        "target_file": "main.py",
                        "confidence": 0.95
                    }
                ],
                "recommended_action": "patch",
                "fixed_files": {}
            })
        else:
            mock_content = (
                f"Parikshit Mentor analysis for: '{last_user_msg[:60]}...'\n\n"
                "System is operating in verified grounded mode. All claims require path & line citations."
            )

        return {
            "content": mock_content,
            "role": "assistant",
            "model": model,
            "input_tokens": 150,
            "output_tokens": 200,
            "mode": "mock"
        }
