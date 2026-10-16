import pytest
import time
from unittest.mock import patch, MagicMock
from httpx import Response, Request

from app.core.config import settings
from app.core.errors import AppError
from app.agents.llm_gateway import LLMGateway

@pytest.mark.asyncio
async def test_watsonx_config_detection():
    orig_provider = settings.LLM_PROVIDER
    orig_key = settings.WATSONX_API_KEY
    orig_proj = settings.WATSONX_PROJECT_ID
    try:
        settings.LLM_PROVIDER = "watsonx"
        settings.WATSONX_API_KEY = ""
        settings.WATSONX_PROJECT_ID = ""
        assert LLMGateway.is_configured() is False

        settings.WATSONX_API_KEY = "test_key"
        settings.WATSONX_PROJECT_ID = "test_project_id"
        assert LLMGateway.is_configured() is True
    finally:
        settings.LLM_PROVIDER = orig_provider
        settings.WATSONX_API_KEY = orig_key
        settings.WATSONX_PROJECT_ID = orig_proj

@pytest.mark.asyncio
async def test_watsonx_role_models():
    orig_provider = settings.LLM_PROVIDER
    try:
        settings.LLM_PROVIDER = "watsonx"
        # Role model should default to IBM Granite or supported watsonx model
        model = LLMGateway.get_role_model("builder")
        assert "granite" in model.lower() or "ibm" in model.lower() or "llama" in model.lower()
    finally:
        settings.LLM_PROVIDER = orig_provider

@pytest.mark.asyncio
async def test_watsonx_unconfigured_error():
    orig_provider = settings.LLM_PROVIDER
    orig_key = settings.WATSONX_API_KEY
    orig_proj = settings.WATSONX_PROJECT_ID
    try:
        settings.LLM_PROVIDER = "watsonx"
        settings.WATSONX_API_KEY = ""
        settings.WATSONX_PROJECT_ID = ""
        with pytest.raises(AppError) as exc_info:
            await LLMGateway.generate_chat([{"role": "user", "content": "hello"}])
        assert exc_info.value.code == "LLM_NOT_CONFIGURED"
    finally:
        settings.LLM_PROVIDER = orig_provider
        settings.WATSONX_API_KEY = orig_key
        settings.WATSONX_PROJECT_ID = orig_proj

@pytest.mark.asyncio
async def test_watsonx_iam_token_caching():
    orig_key = settings.WATSONX_API_KEY
    try:
        settings.WATSONX_API_KEY = "fake_iam_key"
        LLMGateway._cached_iam_token = None
        LLMGateway._cached_iam_expires_at = 0.0

        mock_req = Request("POST", "https://iam.cloud.ibm.com/identity/token")
        mock_resp = Response(
            200,
            json={"access_token": "token_abc123", "expires_in": 3600},
            request=mock_req
        )

        with patch("httpx.AsyncClient.post", return_value=mock_resp) as mock_post:
            token1 = await LLMGateway._get_iam_token()
            assert token1 == "token_abc123"
            assert mock_post.call_count == 1

            # Second call should use cached token without calling API again
            token2 = await LLMGateway._get_iam_token()
            assert token2 == "token_abc123"
            assert mock_post.call_count == 1
    finally:
        settings.WATSONX_API_KEY = orig_key
        LLMGateway._cached_iam_token = None
        LLMGateway._cached_iam_expires_at = 0.0

@pytest.mark.asyncio
async def test_watsonx_chat_completion_mocked():
    orig_provider = settings.LLM_PROVIDER
    orig_key = settings.WATSONX_API_KEY
    orig_proj = settings.WATSONX_PROJECT_ID
    try:
        settings.LLM_PROVIDER = "watsonx"
        settings.WATSONX_API_KEY = "fake_key"
        settings.WATSONX_PROJECT_ID = "fake_proj"
        LLMGateway._cached_iam_token = "valid_cached_token"
        LLMGateway._cached_iam_expires_at = time.time() + 3000

        mock_req = Request("POST", "https://us-south.ml.cloud.ibm.com/ml/v1/text/chat")
        mock_chat_resp = Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "Hello from IBM Granite!"
                        }
                    }
                ],
                "usage": {
                    "prompt_tokens": 15,
                    "completion_tokens": 8
                }
            },
            request=mock_req
        )

        with patch("httpx.AsyncClient.post", return_value=mock_chat_resp):
            res = await LLMGateway.generate_chat([{"role": "user", "content": "Hi"}])
            assert res["content"] == "Hello from IBM Granite!"
            assert res["mode"] == "live"
            assert res["input_tokens"] == 15
            assert res["output_tokens"] == 8
    finally:
        settings.LLM_PROVIDER = orig_provider
        settings.WATSONX_API_KEY = orig_key
        settings.WATSONX_PROJECT_ID = orig_proj
        LLMGateway._cached_iam_token = None
        LLMGateway._cached_iam_expires_at = 0.0

@pytest.mark.asyncio
async def test_deterministic_mock_still_works():
    orig_provider = settings.LLM_PROVIDER
    try:
        settings.LLM_PROVIDER = "mock"
        res = await LLMGateway.generate_chat(
            [{"role": "user", "content": "How do I calculate tax in calculator.py?"}],
            role="mentor"
        )
        assert res["mode"] == "mock"
        assert len(res["content"]) > 0
    finally:
        settings.LLM_PROVIDER = orig_provider
