import pytest
from pathlib import Path
import httpx
from app.main import app
from app.db.database import init_db
from app.services.ingestion_service import IngestionService
from app.services.task_service import TaskService
from app.services.sandbox_service import SandboxService
from app.services.ledger_service import LedgerService

@pytest.mark.asyncio
async def test_sprint2_vibe_coding_and_sandbox():
    await init_db()

    demo_dir = Path("data/demo/calculator_app").resolve()
    assert demo_dir.exists()

    # 1. Ingest base repo
    ingest_res = await IngestionService.ingest_repository(
        source_type="local",
        source_uri=str(demo_dir),
        name="Calculator Vibe Test"
    )
    project_id = ingest_res["project_id"]
    base_storage = Path(ingest_res["storage_path"])
    base_calc_text = (base_storage / "calculator.py").read_text(encoding="utf-8")

    # 2. Create Task (Plan Generation)
    task_res = await TaskService.create_task(
        project_id=project_id,
        request_text="Add multiply function to Calculator with tests"
    )
    assert task_res["task_id"].startswith("tsk_")
    assert task_res["status"] == "planning"
    assert "steps" in task_res["plan"]

    task_id = task_res["task_id"]

    # 3. Approve Plan & Build in Isolated Workspace
    build_res = await TaskService.approve_and_build(task_id)
    assert build_res["status"] == "review"
    assert build_res["workspace_id"].startswith("wsp_")
    assert build_res["patch_id"].startswith("pat_")
    assert len(build_res["files_changed"]) > 0
    assert len(build_res["unified_diff"]) > 0

    workspace_id = build_res["workspace_id"]

    # 4. CRITICAL SAFETY CHECK: Original repository was UNTOUCHED!
    after_calc_text = (base_storage / "calculator.py").read_text(encoding="utf-8")
    assert base_calc_text == after_calc_text, "Original base repo must never be modified by workspace edits!"

    # 5. Sandbox Execution (Run pytest in workspace)
    run_res = await SandboxService.run_command(workspace_id, command="pytest -v")
    assert run_res["run_id"].startswith("run_")
    assert run_res["exit_code"] == 0, f"Tests should pass in workspace. Output: {run_res['stdout']}\n{run_res['stderr']}"
    assert run_res["status"] == "succeeded"
    assert len(run_res["tests"]) >= 4

    # 6. Human Approval Gate
    approval_res = await TaskService.record_human_approval(task_id, decision="approved", actor="user")
    assert approval_res["decision"] == "approved"
    assert approval_res["status"] == "approved"

    # 7. Verify Proof-of-Work Ledger Chain
    chain_check = await LedgerService.verify_chain(project_id=project_id)
    assert chain_check["valid"] is True
    assert chain_check["count"] >= 4  # ingested, plan_created, workspace_created, patch_applied, sandbox_run, approval
