import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiosqlite
from app.db.database import get_db_path
from app.core.errors import success_response, error_response
from app.services.ledger_service import LedgerService
from app.core.logging import logger

router = APIRouter(prefix="/projects", tags=["Projects"])

class CreateProjectRequest(BaseModel):
    name: str
    source_type: str = "git_url"  # git_url | zip | local
    source_uri: str

@router.get("")
async def list_projects():
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM projects ORDER BY created_at DESC;")
        rows = await cursor.fetchall()
        projects = [dict(r) for r in rows]
    return success_response({"projects": projects, "count": len(projects)})

@router.post("")
async def create_project(req: CreateProjectRequest):
    if req.source_type not in ["git_url", "zip", "local"]:
        return error_response("source_type must be git_url, zip, or local", code="INVALID_SOURCE_TYPE")

    project_id = f"prj_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    db_path = get_db_path()

    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            """
            INSERT INTO projects (id, name, source_type, source_uri, created_at, status)
            VALUES (?, ?, ?, ?, ?, 'active');
            """,
            (project_id, req.name, req.source_type, req.source_uri, now_iso)
        )
        await db.commit()

    # Append to proof-of-work ledger
    await LedgerService.append_entry(
        event_type="project_created",
        project_id=project_id,
        payload={
            "project_id": project_id,
            "name": req.name,
            "source_type": req.source_type,
            "source_uri": req.source_uri
        },
        related_ids={"project_id": project_id}
    )

    return success_response({
        "id": project_id,
        "name": req.name,
        "source_type": req.source_type,
        "source_uri": req.source_uri,
        "created_at": now_iso,
        "status": "active"
    }, status_code=201)

@router.get("/{project_id}")
async def get_project(project_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM projects WHERE id = ?;", (project_id,))
        row = await cursor.fetchone()
        if not row:
            return error_response(f"Project {project_id} not found", code="PROJECT_NOT_FOUND", status_code=404)
        
        # Get revisions
        rev_cursor = await db.execute("SELECT * FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC;", (project_id,))
        rev_rows = await rev_cursor.fetchall()
        revisions = [dict(r) for r in rev_rows]

    return success_response({
        "project": dict(row),
        "revisions": revisions
    })
