from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import aiosqlite
import json

from app.core.errors import success_response, error_response
from app.db.database import get_db_path
from app.services.task_service import TaskService
from app.services.sandbox_service import SandboxService

router = APIRouter(tags=["Engineering Tasks & Vibe Coding"])

class CreateTaskRequest(BaseModel):
    request_text: str

class ApprovalRequest(BaseModel):
    decision: str  # approved | rejected

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
async def run_checks(task_id: str, command: str = "pytest -v"):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT id FROM workspaces WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        wsp = await cursor.fetchone()
        if not wsp:
            return error_response("No active workspace found for this task", code="NO_WORKSPACE", status_code=400)

        wsp_id = wsp["id"]

    run_result = await SandboxService.run_command(wsp_id, command=command)
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
