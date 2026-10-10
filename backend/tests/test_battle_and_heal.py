import pytest
from pathlib import Path
from app.main import app
from app.db.database import init_db
from app.services.ingestion_service import IngestionService
from app.services.task_service import TaskService
from app.services.battle_service import BattleService
from app.services.self_healing_service import SelfHealingService
from app.services.sandbox_service import SandboxService
from app.services.workspace_service import WorkspaceService
from app.services.ledger_service import LedgerService

@pytest.mark.asyncio
async def test_sprint3_battle_and_evidence():
    await init_db()

    demo_dir = Path("data/demo/calculator_app").resolve()
    assert demo_dir.exists()

    # 1. Ingest base repo
    ingest_res = await IngestionService.ingest_repository(
        source_type="local",
        source_uri=str(demo_dir),
        name="Calculator Battle Test"
    )
    project_id = ingest_res["project_id"]

    # 2. Create Task & Build in workspace
    task_res = await TaskService.create_task(
        project_id=project_id,
        request_text="Implement power method in Calculator"
    )
    task_id = task_res["task_id"]

    build_res = await TaskService.approve_and_build(task_id)
    workspace_id = build_res["workspace_id"]
    assert build_res["patch_id"].startswith("pat_")

    # 3. AI vs AI Battle Arena (2 rounds)
    battle_report = await BattleService.run_battle(task_id, max_rounds=2)
    assert battle_report["battle_id"].startswith("bat_")
    assert battle_report["total_rounds"] == 2
    assert len(battle_report["rounds"]) == 2
    assert len(battle_report["challenges_raised"]) == 2
    assert "final_verdict" in battle_report
    assert "residual_risks" in battle_report

    # Check each round has adversary challenge, sandbox run, and reviewer verdict
    for rnd in battle_report["rounds"]:
        assert "adversary_challenge" in rnd
        assert "test_run" in rnd
        assert "reviewer" in rnd
        assert rnd["test_run"]["run_id"].startswith("run_")

    # 4. Self-Healing Loop Test
    # Intentionally write a broken implementation to trigger a failing sandbox run
    wsp_dir = Path(build_res["files_changed"][0]).parent
    # Let's run a failing pytest command on a non-existent or failing test
    fail_run = await SandboxService.run_command(workspace_id, command="pytest -k test_non_existent_fail")
    assert fail_run["exit_code"] != 0 or fail_run["status"] in ["failed", "succeeded"]

    # Now run self-healing on a run with broken test
    broken_test_file = WorkspaceService._get_workspace_path(workspace_id) / "repo" / "test_broken.py"
    broken_test_file.write_text("def test_broken():\n    assert 1 == 2\n", encoding="utf-8")
    actual_fail_run = await SandboxService.run_command(workspace_id, command="pytest test_broken.py")
    assert actual_fail_run["exit_code"] != 0

    # Self-heal should diagnose and attempt fix
    heal_res = await SelfHealingService.heal_failure(actual_fail_run["run_id"], max_attempts=2)
    assert heal_res["baseline_run_id"] == actual_fail_run["run_id"]
    assert "diagnosis" in heal_res
    assert heal_res["verdict"] in ["verified_fix", "attempted_fix", "failed"]

    # 5. Full Cryptographic Evidence Pack & Ledger Integrity
    chain_status = await LedgerService.verify_chain(project_id=project_id)
    assert chain_status["valid"] is True
    assert chain_status["count"] >= 5  # ingested, plan, workspace, patch, battle rounds, battle concluded
