from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import aiosqlite
import json

from app.core.errors import success_response, error_response
from app.db.database import get_db_path
from app.services.battle_service import BattleService
from app.services.self_healing_service import SelfHealingService
from app.services.ledger_service import LedgerService

router = APIRouter(tags=["AI vs AI Battle & Self-Healing"])

class StartBattleRequest(BaseModel):
    max_rounds: int = 2

class DirectBattleRequest(BaseModel):
    task_id: Optional[str] = None
    max_rounds: int = 2

class DirectHealRequest(BaseModel):
    run_id: Optional[str] = None
    max_attempts: int = 2

@router.post("/battles/run")
async def run_battle_direct(req: DirectBattleRequest):
    report = await BattleService.run_battle(req.task_id or "default", max_rounds=req.max_rounds)
    return success_response(report, status_code=200)

@router.post("/healing/diagnose")
@router.post("/healing/heal")
async def diagnose_direct(req: DirectHealRequest):
    result = await SelfHealingService.heal_failure(req.run_id or "default", max_attempts=req.max_attempts)
    return success_response(result, status_code=200)

@router.post("/tasks/{task_id}/battles")
async def start_battle(task_id: str, req: StartBattleRequest):
    report = await BattleService.run_battle(task_id, max_rounds=req.max_rounds)
    return success_response(report, status_code=201)

@router.get("/battles/{battle_id}")
async def get_battle(battle_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        b_cursor = await db.execute("SELECT * FROM battles WHERE id = ?;", (battle_id,))
        battle = await b_cursor.fetchone()
        if not battle:
            return error_response("Battle not found", code="NOT_FOUND", status_code=404)

        rounds_cursor = await db.execute("SELECT * FROM battle_rounds WHERE battle_id = ? ORDER BY round_number ASC;", (battle_id,))
        rounds = [dict(r) for r in await rounds_cursor.fetchall()]

    return success_response({
        "battle": dict(battle),
        "rounds": rounds
    })

@router.post("/runs/{run_id}/heal")
async def heal_run(run_id: str, max_attempts: int = 3):
    result = await SelfHealingService.heal_failure(run_id, max_attempts=max_attempts)
    return success_response(result)

@router.get("/tasks/{task_id}/evidence-pack")
async def get_evidence_pack(task_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        t_cursor = await db.execute("SELECT * FROM tasks WHERE id = ?;", (task_id,))
        task = await t_cursor.fetchone()
        if not task:
            return error_response("Task not found", code="NOT_FOUND", status_code=404)

        project_id = task["project_id"]

        wsp_cursor = await db.execute("SELECT * FROM workspaces WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        wsp = await wsp_cursor.fetchone()

        patch = None
        runs = []
        if wsp:
            p_cursor = await db.execute("SELECT * FROM patches WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1;", (wsp["id"],))
            p_row = await p_cursor.fetchone()
            patch = dict(p_row) if p_row else None

            r_cursor = await db.execute("SELECT * FROM sandbox_runs WHERE workspace_id = ?;", (wsp["id"],))
            runs = [dict(r) for r in await r_cursor.fetchall()]

        b_cursor = await db.execute("SELECT * FROM battles WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        b_row = await b_cursor.fetchone()
        battle = dict(b_row) if b_row else None

    # Cryptographic ledger verification
    ledger_verification = await LedgerService.verify_chain(project_id=project_id)
    ledger_entries = await LedgerService.list_entries(project_id=project_id, limit=100)

    evidence_pack = {
        "spec_version": "2.0-developer-ready",
        "task_id": task_id,
        "project_id": project_id,
        "cryptographic_verification": ledger_verification,
        "task": dict(task),
        "patch": patch,
        "sandbox_runs": runs,
        "battle": battle,
        "ledger_chain": ledger_entries
    }

    return success_response(evidence_pack)

@router.get("/battles/{battle_id}/report")
async def get_battle_report(battle_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        b_cursor = await db.execute("SELECT * FROM battles WHERE id = ?;", (battle_id,))
        battle = await b_cursor.fetchone()
        if not battle:
            return error_response("Battle not found", code="BATTLE_NOT_FOUND", status_code=404)

        rounds_cursor = await db.execute(
            "SELECT * FROM battle_rounds WHERE battle_id = ? ORDER BY round_number ASC;",
            (battle_id,)
        )
        rounds = [dict(r) for r in await rounds_cursor.fetchall()]

    return success_response({
        "battle_id": battle_id,
        "task_id": battle["task_id"],
        "status": battle["status"],
        "rounds": rounds,
        "final_verdict": "verified" if battle["status"] in ["concluded", "passed"] else battle["status"]
    })

@router.get("/repair-attempts/{attempt_id}")
async def get_repair_attempt(attempt_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM repair_attempts WHERE id = ?;", (attempt_id,))
        attempt = await cursor.fetchone()
        if not attempt:
            return error_response(f"Repair attempt {attempt_id} not found", code="ATTEMPT_NOT_FOUND", status_code=404)
        return success_response(dict(attempt))
