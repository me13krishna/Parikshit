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
        raw_text = "\n".join(m.get("content", "") for m in messages)
        all_text = raw_text.lower()
        last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")

        # 1. Architecture Overview synthesis
        if "architecture overview" in all_text or ("files:" in all_text and "symbols:" in all_text):
            mock_content = cls._generate_dynamic_architecture_mock(raw_text)

        # 2. Mentor Chat QA synthesis
        elif "developer question:" in all_text or "code context:" in all_text or ("citations" in all_text and "answer_markdown" in all_text):
            mock_content = cls._generate_dynamic_mentor_chat_mock(raw_text, last_user_msg)

        # 3. Builder Agent
        elif role == "builder" or "file to update:" in all_text:
            mock_content = cls._generate_dynamic_builder_mock(raw_text)

        # 4. Task Plan Generation
        elif "files_affected" in all_text or "engineering implementation plan" in all_text:
            mock_content = cls._generate_dynamic_plan_mock(raw_text)

        # 5. Adversarial QA Challenge
        elif "adversary" in all_text or "suggested_test" in all_text:
            mock_content = cls._generate_dynamic_adversary_mock(raw_text)

        # 6. Self-Healing Diagnosis
        elif "heal" in all_text or "hypotheses" in all_text:
            mock_content = cls._generate_dynamic_healing_mock(raw_text)

        # 7. Digital Twin Impact Prediction
        elif "predict which files" in all_text or "predicted_files" in all_text:
            mock_content = cls._generate_dynamic_twin_predict_mock(raw_text)

        # Fallback generic grounded JSON
        else:
            mock_content = json.dumps({
                "status": "grounded",
                "answer_markdown": f"Parikshit Mentor grounded analysis for: '{last_user_msg[:80]}'.\n\nCodebase entities verified against repository AST index.",
                "citations": []
            })

        return {
            "content": mock_content,
            "role": "assistant",
            "model": model,
            "input_tokens": 150,
            "output_tokens": 200,
            "mode": "mock"
        }

    @classmethod
    def _generate_dynamic_architecture_mock(cls, raw_text: str) -> str:
        import re
        files = []
        symbols = []
        files_match = re.search(r'Files:\s*(\[.*?\])\s*(?:Symbols:|$)', raw_text, re.DOTALL)
        if files_match:
            try:
                files = json.loads(files_match.group(1))
            except Exception:
                pass
        symbols_match = re.search(r'Symbols:\s*(\[.*?\])\s*(?:Produce JSON|$)', raw_text, re.DOTALL)
        if symbols_match:
            try:
                symbols = json.loads(symbols_match.group(1))
            except Exception:
                pass

        if not files:
            return json.dumps({
                "components": [
                    {
                        "name": "Core Module",
                        "responsibility": "Primary execution workflows and domain logic",
                        "files": [],
                        "citations": []
                    }
                ],
                "relationships": []
            })

        components_map: Dict[str, List[str]] = {}
        for f in files:
            p = f.get("path", "")
            parts = p.split("/")
            if len(parts) > 1:
                group_key = parts[0]
            else:
                group_key = "tests" if "test" in p.lower() else "core"
            if group_key not in components_map:
                components_map[group_key] = []
            components_map[group_key].append(p)

        components = []
        relationships = []
        prev_comp_name = None

        for group_name, file_list in list(components_map.items())[:5]:
            title = group_name.replace("_", " ").title()
            comp_name = f"{title} Module"
            comp_citations = []
            for s in symbols:
                if s.get("path") in file_list:
                    comp_citations.append({
                        "path": s["path"],
                        "start_line": s.get("start_line", 1),
                        "end_line": s.get("end_line", 10)
                    })
                    if len(comp_citations) >= 2:
                        break

            components.append({
                "name": comp_name,
                "responsibility": f"Encapsulates {group_name} logic across {len(file_list)} files ({', '.join(file_list[:2])})",
                "files": file_list[:5],
                "citations": comp_citations
            })

            if prev_comp_name:
                relationships.append({
                    "from": prev_comp_name,
                    "to": comp_name,
                    "type": "import",
                    "citations": []
                })
            prev_comp_name = comp_name

        if not components:
            components.append({
                "name": "Core Service",
                "responsibility": "Main repository execution domain",
                "files": [f.get("path", "") for f in files[:3]],
                "citations": []
            })

        return json.dumps({
            "components": components,
            "relationships": relationships
        })

    @classmethod
    def _generate_dynamic_mentor_chat_mock(cls, raw_text: str, last_user_msg: str) -> str:
        import re
        q_match = re.search(r'Developer Question:\s*["\']?(.*?)["\']?\s*\n', raw_text)
        question = q_match.group(1).strip() if q_match else last_user_msg.strip()

        excerpt_pattern = r'---\s*EXCERPT\s*\d+\s*\(([^:]+):(\d+)-(\d+)\)\s*---\n(.*?)(?=(?:---\s*EXCERPT|\Z))'
        matches = re.findall(excerpt_pattern, raw_text, re.DOTALL)

        if matches:
            citations = []
            excerpts_summary = []
            for path, s_line, e_line, content in matches[:3]:
                start_l = int(s_line)
                end_l = int(e_line)
                citations.append({
                    "path": path.strip(),
                    "start_line": start_l,
                    "end_line": end_l
                })
                defs = re.findall(r'(?:def|class|function|const|let|var)\s+([A-Za-z0-9_]+)', content)
                def_str = f"defines `{', '.join(defs[:3])}`" if defs else "implements logic"
                preview_lines = [l.strip() for l in content.splitlines() if l.strip() and not l.strip().startswith("#") and not l.strip().startswith("//")][:3]
                preview = " / ".join(preview_lines) if preview_lines else "core execution flow"
                excerpts_summary.append(f"- **[`{path.strip()}`](file:///{path.strip()})** (Lines {start_l}–{end_l}): {def_str}. Snippet: `{preview[:100]}`")

            summary_bullets = "\n".join(excerpts_summary)
            answer_md = (
                f"### Codebase Grounded Analysis\n\n"
                f"Based on the indexed repository AST and code retrieval for: **\"{question}\"**\n\n"
                f"#### Verified Code Locations:\n"
                f"{summary_bullets}\n\n"
                f"#### Implementation Overview:\n"
                f"The logic in `{matches[0][0].strip()}` provides the implementation matching this request. "
                f"Citations are server-verified against the repository commit tree."
            )
            return json.dumps({
                "status": "grounded",
                "answer_markdown": answer_md,
                "citations": citations,
                "uncertainty_notes": None
            })
        else:
            return json.dumps({
                "status": "partially_grounded",
                "answer_markdown": f"No direct code matches were found in the indexed repository for: '{question}'. Explore the repository file explorer to view indexed files, or ask about specific modules and functions.",
                "citations": [],
                "uncertainty_notes": "Query did not match any indexed AST chunks."
            })

    @classmethod
    def _generate_dynamic_builder_mock(cls, raw_text: str) -> str:
        import re
        file_match = re.search(r'File to update:\s*(.+)', raw_text)
        file_rel = file_match.group(1).strip() if file_match else "main.py"

        task_match = re.search(r'Task:\s*["\']?(.*?)["\']?\s*\n', raw_text)
        task_text = task_match.group(1).strip() if task_match else "Update codebase implementation"

        code_match = re.search(r'Existing Code:\s*```[a-zA-Z]*\s*(.*?)\s*```', raw_text, re.DOTALL)
        existing_code = code_match.group(1).strip() if code_match else ""

        ext = Path(file_rel).suffix.lower()
        if ext == ".py":
            if existing_code:
                new_code = existing_code + f"\n\n# Verification extension applied by Parikshit Builder for: {task_text}\ndef verified_builder_extension():\n    \"\"\"Implementation supporting {task_text}.\"\"\"\n    return True\n"
            else:
                new_code = f"# Implementation for {task_text}\ndef verified_builder_extension():\n    return True\n"
            return f"```python\n{new_code}\n```"
        else:
            if existing_code:
                new_code = existing_code + f"\n\n// Verification extension applied by Parikshit Builder for: {task_text}\nexport function verifiedBuilderExtension() {{\n  return true;\n}}\n"
            else:
                new_code = f"// Implementation for {task_text}\nexport function verifiedBuilderExtension() {{\n  return true;\n}}\n"
            return f"```typescript\n{new_code}\n```"

    @classmethod
    def _generate_dynamic_plan_mock(cls, raw_text: str) -> str:
        import re
        req_match = re.search(r'Developer Request:\s*["\']?(.*?)["\']?\s*\n', raw_text)
        request_text = req_match.group(1).strip() if req_match else "Implement requested task"

        file_candidates = re.findall(r'([a-zA-Z0-9_\-\./]+\.(?:py|ts|js|jsx|tsx|go|rs|java|c|cpp))', raw_text)
        clean_files = [f for f in dict.fromkeys(file_candidates) if not f.startswith("---") and not f.startswith("test_")]
        if not clean_files:
            clean_files = ["main.py", "test_main.py"]

        affected = clean_files[:2]
        return json.dumps({
            "summary": f"Implement changes for: {request_text}",
            "files_affected": affected,
            "steps": [
                {"step": 1, "action": "modify", "path": affected[0], "description": f"Implement core logic for {request_text}"},
                {"step": 2, "action": "modify", "path": affected[-1] if len(affected) > 1 else affected[0], "description": "Add verification unit test coverage"}
            ],
            "testing_strategy": "Run verification test suite in isolated workspace sandbox."
        })

    @classmethod
    def _generate_dynamic_adversary_mock(cls, raw_text: str) -> str:
        import re
        diff_match = re.search(r'```diff\s*(.*?)\s*```', raw_text, re.DOTALL)
        task_match = re.search(r'Task Description:\s*["\']?(.*?)["\']?\s*\n', raw_text)
        task_text = task_match.group(1).strip() if task_match else "code modifications"

        target_file = "module.py"
        target_stem = "module"
        if diff_match:
            diff_text = diff_match.group(1)
            file_matches = re.findall(r'(?:---|\+\+\+)\s+[ab]/(.+)', diff_text)
            if file_matches:
                target_file = file_matches[-1]
                target_stem = Path(target_file).stem

        test_fn_name = f"test_adversary_boundary_{target_stem}"
        return json.dumps({
            "challenge_title": f"Edge Case & Boundary Stress Test for {target_file}",
            "challenge_description": f"Validates that {target_file} handles edge cases, empty values, or extreme inputs safely for '{task_text}'.",
            "severity": "medium",
            "test_code": f"def {test_fn_name}():\n    # Adversarial QA boundary challenge for {target_file}\n    assert True\n"
        })

    @classmethod
    def _generate_dynamic_healing_mock(cls, raw_text: str) -> str:
        import re
        file_match = re.search(r'([a-zA-Z0-9_\-\./]+\.py)', raw_text)
        target = file_match.group(1) if file_match else "main.py"
        return json.dumps({
            "hypotheses": [
                {
                    "rank": 1,
                    "description": f"Boundary edge condition or unhandled exception in {target}",
                    "target_file": target,
                    "confidence": 0.95
                }
            ],
            "recommended_action": "patch",
            "fixed_files": {}
        })

    @classmethod
    def _generate_dynamic_twin_predict_mock(cls, raw_text: str) -> str:
        import re
        files_match = re.search(r'Available Repository Files:\s*(\[.*?\])', raw_text, re.DOTALL)
        files = []
        if files_match:
            try:
                files = json.loads(files_match.group(1))
            except Exception:
                pass
        predicted = [f for f in files if not f.startswith("test_")][:2] if files else ["main.py"]
        return json.dumps({
            "predicted_files": predicted,
            "rationale": "Identified candidate impact targets through AST dependency analysis.",
            "risk_assessment": "medium"
        })
