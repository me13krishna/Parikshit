import pytest
from pathlib import Path
from pydantic import BaseModel
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.core.errors import AppError
from app.agents.llm_gateway import LLMGateway
from app.models.schemas import MentorAnswer, BuilderPatch
from app.services.citation_verifier import CitationVerifier
from app.services.battle_service import BattleService
from app.services.self_healing_service import SelfHealingService
from app.services.task_service import TaskService
from app.services.ingestion_service import IngestionService
from app.db.database import init_db

class SimpleTestModel(BaseModel):
    message: str
    code: int

@pytest.mark.asyncio
async def test_llm_gateway_structured_output_validation():
    # In mock mode, test generate_chat has mode="mock"
    res = await LLMGateway.generate_chat([{"role": "user", "content": "hello"}])
    assert res["mode"] == "mock"
    assert "content" in res

@pytest.mark.asyncio
async def test_citation_verifier_with_hallucinated_citation_and_sha(tmp_path):
    repo_dir = tmp_path / "test_repo"
    repo_dir.mkdir()
    sample_file = repo_dir / "service.py"
    sample_file.write_text("line 1\nline 2\nline 3\nline 4\nline 5\n", encoding="utf-8")

    # 1. Valid citation
    valid_cit = {
        "path": "service.py",
        "start_line": 2,
        "end_line": 4,
        "commit_sha": "abc12345"
    }
    res_valid = CitationVerifier.verify_single_citation(repo_dir, valid_cit, expected_commit_sha="abc12345")
    assert res_valid["verified"] is True
    assert "snippet_hash" in res_valid

    # 2. Hallucinated file path
    fake_path_cit = {
        "path": "ghost_module.py",
        "start_line": 1,
        "end_line": 5
    }
    res_fake_path = CitationVerifier.verify_single_citation(repo_dir, fake_path_cit)
    assert res_fake_path["verified"] is False
    assert "File does not exist" in res_fake_path["error"]

    # 3. Hallucinated / out of range lines
    out_of_range_cit = {
        "path": "service.py",
        "start_line": 10,
        "end_line": 20
    }
    res_oor = CitationVerifier.verify_single_citation(repo_dir, out_of_range_cit)
    assert res_oor["verified"] is False
    assert "Invalid line range" in res_oor["error"]

    # 4. Commit SHA mismatch
    sha_mismatch_cit = {
        "path": "service.py",
        "start_line": 1,
        "end_line": 2,
        "commit_sha": "wrong_sha"
    }
    res_mismatch = CitationVerifier.verify_single_citation(repo_dir, sha_mismatch_cit, expected_commit_sha="actual_sha")
    assert res_mismatch["verified"] is False
    assert "Commit SHA mismatch" in res_mismatch["error"]

    # 5. Invalid line types (must be int)
    invalid_type_cit = {
        "path": "service.py",
        "start_line": "not_an_int",
        "end_line": "three"
    }
    res_type = CitationVerifier.verify_single_citation(repo_dir, invalid_type_cit)
    assert res_type["verified"] is False
    assert "integers" in res_type["error"].lower()

@pytest.mark.asyncio
async def test_human_gate_blocks_export_without_approval():
    await init_db()
    demo_uri = str(Path(settings.PARIKSHIT_DATA_DIR) / "demo")
    ingest = await IngestionService.ingest_repository(
        source_type="local",
        source_uri=demo_uri,
        name="Demo For Gate Test"
    )
    task = await TaskService.create_task(ingest["project_id"], "Add multiply feature")
    task_id = task["task_id"]

    # Build patch
    await TaskService.approve_and_build(task_id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Attempt export without human approval -> 403 Forbidden
        res_blocked = await client.post(f"/api/v1/tasks/{task_id}/export")
        assert res_blocked.status_code == 403
        assert res_blocked.json()["error"]["code"] == "APPROVAL_REQUIRED"

        # 2. Record human approval
        res_approve = await client.post(f"/api/v1/tasks/{task_id}/approve", json={"decision": "approved"})
        assert res_approve.status_code == 200

        # 3. Export now succeeds
        res_allowed = await client.post(f"/api/v1/tasks/{task_id}/export")
        assert res_allowed.status_code == 200
        assert res_allowed.json()["data"]["status"] == "exported"
        assert "unified_diff" in res_allowed.json()["data"]

@pytest.mark.asyncio
async def test_multi_round_battle_execution():
    await init_db()
    demo_uri = str(Path(settings.PARIKSHIT_DATA_DIR) / "demo")
    ingest = await IngestionService.ingest_repository(
        source_type="local",
        source_uri=demo_uri,
        name="Demo For Battle Test"
    )
    task = await TaskService.create_task(ingest["project_id"], "Refactor math operations")
    task_id = task["task_id"]
    await TaskService.approve_and_build(task_id)

    # Run 2 rounds of AI vs AI battle
    report = await BattleService.run_battle(task_id, max_rounds=2)
    assert report["total_rounds"] == 2
    assert len(report["rounds"]) == 2
    assert "final_verdict" in report
    assert "challenges_raised" in report
    assert report["mode"] == "mock"
