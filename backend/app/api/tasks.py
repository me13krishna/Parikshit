from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import aiosqlite
import json

from app.core.errors import success_response, error_response, AppError
from app.db.database import get_db_path
from app.services.task_service import TaskService
from app.services.sandbox_service import SandboxService

router = APIRouter(tags=["Engineering Tasks & Vibe Coding"])

CHECK_PROFILES = {
    "pytest": ["pytest", "-v"],
    "pytest_coverage": ["pytest", "-v", "--cov=."],
    "test_quick": ["pytest", "-q"]
}

def resolve_check_command(profile: Optional[str], command: Optional[str]) -> str:
    if profile:
        p_clean = profile.strip()
        if p_clean in CHECK_PROFILES:
            return " ".join(CHECK_PROFILES[p_clean])
        raise AppError(
            f"Invalid check profile '{profile}'. Allowed profiles: {list(CHECK_PROFILES.keys())}",
            code="INVALID_CHECK_PROFILE",
            status_code=400
        )
    if command:
        c_clean = command.strip()
        if c_clean in CHECK_PROFILES:
            return " ".join(CHECK_PROFILES[c_clean])
        for p_args in CHECK_PROFILES.values():
            if c_clean == " ".join(p_args):
                return c_clean
        raise AppError(
            f"Disallowed check command '{command}'. Allowed profiles: {list(CHECK_PROFILES.keys())}",
            code="INVALID_CHECK_PROFILE",
            status_code=400
        )
    return "pytest -v"

class CreateTaskRequest(BaseModel):
    request_text: str

class ApprovalRequest(BaseModel):
    decision: str  # approved | rejected

class RunCommandRequest(BaseModel):
    profile: Optional[str] = None
    command: Optional[str] = None
    timeout_sec: Optional[int] = None

@router.post("/projects/{project_id}/tasks")
async def create_task(project_id: str, req: CreateTaskRequest):
    result = await TaskService.create_task(project_id, req.request_text)
    return success_response(result, status_code=201)

@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM tasks WHERE id = ?;", (task_id,))
        task = await cursor.fetchone()
        if not task:
            return error_response(f"Task {task_id} not found", code="NOT_FOUND", status_code=404)

        plan_cursor = await db.execute("SELECT * FROM plans WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        plan = await plan_cursor.fetchone()

        wsp_cursor = await db.execute("SELECT * FROM workspaces WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        wsp = await wsp_cursor.fetchone()

        patch = None
        if wsp:
            patch_cursor = await db.execute("SELECT * FROM patches WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1;", (wsp["id"],))
            patch = await patch_cursor.fetchone()

    return success_response({
        "task": dict(task),
        "plan": json.loads(plan["content"]) if plan else None,
        "workspace": dict(wsp) if wsp else None,
        "patch": {
            "id": patch["id"],
            "unified_diff": patch["unified_diff"],
            "files_changed": json.loads(patch["files_changed"])
        } if patch else None
    })

@router.post("/tasks/{task_id}/build")
async def approve_and_build(task_id: str):
    result = await TaskService.approve_and_build(task_id)
    return success_response(result)

@router.post("/tasks/{task_id}/run-checks")
async def run_checks(
    task_id: str,
    command: Optional[str] = Query(default=None),
    profile: Optional[str] = Query(default=None)
):
    resolved_cmd = resolve_check_command(profile, command)
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id FROM workspaces WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        wsp = await cursor.fetchone()
        if not wsp:
            return error_response("No active workspace found for this task", code="NO_WORKSPACE", status_code=400)

        wsp_id = wsp["id"]

    run_result = await SandboxService.run_command(wsp_id, command=resolved_cmd)
    return success_response(run_result)

@router.post("/tasks/{task_id}/approve")
async def record_approval(task_id: str, req: ApprovalRequest):
    result = await TaskService.record_human_approval(task_id, req.decision)
    return success_response(result)

@router.get("/tasks/{task_id}/diff")
async def get_task_diff(task_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT p.unified_diff, p.files_changed
            FROM patches p
            JOIN workspaces w ON p.workspace_id = w.id
            WHERE w.task_id = ?
            ORDER BY p.created_at DESC LIMIT 1;
            """,
            (task_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return error_response("No diff available for this task", code="NOT_FOUND", status_code=404)

    return success_response({
        "unified_diff": row["unified_diff"],
        "files_changed": json.loads(row["files_changed"])
    })

@router.post("/tasks/{task_id}/plan")
async def generate_task_plan(task_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM tasks WHERE id = ?;", (task_id,))
        task = await cursor.fetchone()
        if not task:
            return error_response(f"Task {task_id} not found", code="TASK_NOT_FOUND", status_code=404)

        plan_cursor = await db.execute("SELECT * FROM plans WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        plan = await plan_cursor.fetchone()
        plan_content = json.loads(plan["content"]) if plan else {
            "steps": [
                "Understand repository context and existing interfaces",
                "Generate precise unified diff patch in isolated workspace",
                "Execute automated test suite in sandbox runner",
                "Require human approval gate before final merge"
            ]
        }
    return success_response({"task_id": task_id, "plan": plan_content})

@router.post("/tasks/{task_id}/approve-plan")
async def approve_task_plan(task_id: str):
    db_path = get_db_path()
    now_iso = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(db_path) as db:
        await db.execute("UPDATE plans SET approved_at = ? WHERE task_id = ?;", (now_iso, task_id))
        await db.commit()
    return success_response({"task_id": task_id, "approved_at": now_iso, "status": "plan_approved"})

@router.post("/workspaces/{workspace_id}/runs")
async def execute_workspace_run(workspace_id: str, req: RunCommandRequest):
    resolved_cmd = resolve_check_command(req.profile, req.command)
    run_result = await SandboxService.run_command(workspace_id, command=resolved_cmd, timeout_sec=req.timeout_sec)
    return success_response(run_result, status_code=201)

@router.get("/runs/{run_id}")
async def get_sandbox_run(run_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM sandbox_runs WHERE id = ?;", (run_id,))
        row = await cursor.fetchone()
        if not row:
            return error_response(f"Run {run_id} not found", code="RUN_NOT_FOUND", status_code=404)

        t_cursor = await db.execute("SELECT * FROM test_results WHERE sandbox_run_id = ?;", (run_id,))
        tests = [dict(t) for t in await t_cursor.fetchall()]

        a_cursor = await db.execute("SELECT * FROM evidence_artifacts WHERE sandbox_run_id = ?;", (run_id,))
        artifacts = [dict(a) for a in await a_cursor.fetchall()]

    return success_response({
        **dict(row),
        "tests": tests,
        "artifacts": artifacts
    })

@router.get("/runs/{run_id}/artifacts/{artifact_id}")
async def get_run_artifact(run_id: str, artifact_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM evidence_artifacts WHERE id = ? AND sandbox_run_id = ?;", (artifact_id, run_id))
        row = await cursor.fetchone()
        if not row:
            return error_response("Artifact not found", code="ARTIFACT_NOT_FOUND", status_code=404)
        return success_response(dict(row))
