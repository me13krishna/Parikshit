import os
import json
import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.logging import logger

class LLMGateway:
    """
    LLM Gateway abstraction layer with provider switching, cost estimation,
    structured output support, and robust mock fallback.
    """
    
    @staticmethod
    def is_configured() -> bool:
        if settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            return True
        if settings.LLM_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
            return True
        return False

    @classmethod
    async def generate_chat(
        cls,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        response_format: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        target_model = model or settings.LLM_DEFAULT_MODEL

        # If not configured or mock selected, provide sensible mock response
        if not cls.is_configured() or settings.LLM_PROVIDER == "mock":
            logger.info("Using LLM Mock Provider fallback")
            return cls._mock_response(messages, target_model)

        if settings.LLM_PROVIDER == "openai":
            return await cls._call_openai(messages, target_model, temperature, response_format)
        
        raise NotImplementedError(f"Provider {settings.LLM_PROVIDER} not yet implemented")

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

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.OPENAI_BASE_URL}/chat/completions",
                headers=headers,
                json=payload
            )
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

    @classmethod
    def _mock_response(cls, messages: List[Dict[str, str]], model: str) -> Dict[str, Any]:
        last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        
        # Check if caller expects JSON
        if "overview" in last_user_msg.lower():
            mock_content = json.dumps({
                "components": [
                    {
                        "name": "API Layer",
                        "responsibility": "Routing, serialization, and input validation",
                        "files": ["backend/app/main.py"],
                        "citations": []
                    },
                    {
                        "name": "Proof-of-Work Ledger",
                        "responsibility": "Cryptographic SHA-256 audit trail",
                        "files": ["backend/app/services/ledger_service.py"],
                        "citations": []
                    }
                ],
                "relationships": [
                    {
                        "from": "API Layer",
                        "to": "Proof-of-Work Ledger",
                        "type": "call",
                        "citations": []
                    }
                ]
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
            "output_tokens": 200
        }
