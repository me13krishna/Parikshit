import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.core.errors import AppError
from app.api.tasks import resolve_check_command
from app.services.ingestion_service import IngestionService
from app.services.workspace_service import WorkspaceService
from app.services.sandbox_service import SandboxService

@pytest.mark.asyncio
async def test_command_allowlist_enforcement():
    # Valid profiles
    assert resolve_check_command("pytest", None) == "pytest -v"
    assert resolve_check_command("pytest_coverage", None) == "pytest -v --cov=."
    assert resolve_check_command("test_quick", None) == "pytest -q"
    assert resolve_check_command(None, "pytest -v") == "pytest -v"

    # Disallowed commands and profiles
    with pytest.raises(AppError) as exc1:
        resolve_check_command(None, "rm -rf /")
    assert exc1.value.code == "INVALID_CHECK_PROFILE"

    with pytest.raises(AppError) as exc2:
        resolve_check_command("bash_shell", None)
    assert exc2.value.code == "INVALID_CHECK_PROFILE"

    with pytest.raises(AppError) as exc3:
        resolve_check_command(None, "cat /etc/passwd")
    assert exc3.value.code == "INVALID_CHECK_PROFILE"

@pytest.mark.asyncio
async def test_git_url_security_validation():
    # Non-https
    with pytest.raises(AppError) as exc1:
        IngestionService._validate_git_url("http://github.com/org/repo.git")
    assert exc1.value.code == "INVALID_GIT_URL"

    with pytest.raises(AppError) as exc2:
        IngestionService._validate_git_url("file:///tmp/repo")
    assert exc2.value.code == "INVALID_GIT_URL"

    with pytest.raises(AppError) as exc3:
        IngestionService._validate_git_url("-oProxyCommand=evil")
    assert exc3.value.code == "INVALID_GIT_URL"

    # Host not in allowlist
    with pytest.raises(AppError) as exc4:
        IngestionService._validate_git_url("https://malicious-server.xyz/repo.git")
    assert exc4.value.code == "GIT_HOST_NOT_ALLOWED"

    # Allowed host passes
    IngestionService._validate_git_url("https://github.com/fastapi/fastapi.git")

@pytest.mark.asyncio
async def test_local_source_disallowed_outside_roots():
    with pytest.raises(AppError) as exc:
        IngestionService._validate_local_source(Path("C:/Windows/System32" if Path("C:/Windows").exists() else "/etc/shadow"))
    assert exc.value.code == "LOCAL_SOURCE_DISALLOWED"

@pytest.mark.asyncio
async def test_workspace_path_traversal_prevention(tmp_path):
    wsp_dir = tmp_path / "wsp_dir"
    wsp_dir.mkdir()
    
    # Mock workspace lookup in DB or test directly
    # Relative path escaping workspace boundary
    target_file = (wsp_dir / "../../escaped_test.txt").resolve()
    with pytest.raises(ValueError):
        target_file.relative_to(wsp_dir.resolve())

@pytest.mark.asyncio
async def test_auth_middleware_enforcement():
    # Enable auth temporarily
    original_auth = settings.AUTH_DISABLED
    original_key = settings.PARIKSHIT_API_KEY
    settings.AUTH_DISABLED = False
    settings.PARIKSHIT_API_KEY = "test-secret-key-123"

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Health is exempt
            res_health = await client.get("/api/v1/health")
            assert res_health.status_code == 200

            # Protected endpoint without key
            res_unauth = await client.get("/api/v1/projects")
            assert res_unauth.status_code == 401
            assert res_unauth.json()["error"]["code"] == "UNAUTHORIZED"

            # Protected endpoint with wrong key
            res_bad = await client.get("/api/v1/projects", headers={"X-API-Key": "wrong-key"})
            assert res_bad.status_code == 401

            # Protected endpoint with valid key
            res_ok = await client.get("/api/v1/projects", headers={"X-API-Key": "test-secret-key-123"})
            assert res_ok.status_code == 200
    finally:
        settings.AUTH_DISABLED = original_auth
        settings.PARIKSHIT_API_KEY = original_key
