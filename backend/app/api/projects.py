import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
import aiosqlite
from pathlib import Path
from app.db.database import get_db_path
from app.core.errors import success_response, error_response
from app.services.ledger_service import LedgerService
from app.core.logging import logger

router = APIRouter(prefix="/projects", tags=["Projects"])

class IngestProjectRequest(BaseModel):
    name: Optional[str] = None
    source_type: str = "git_url"  # git_url | zip | local
    source_uri: Optional[str] = None

@router.get("")
async def list_projects():
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT p.*, r.id as default_revision_id
            FROM projects p
            LEFT JOIN (
                SELECT project_id, id, MAX(indexed_at)
                FROM repo_revisions
                GROUP BY project_id
            ) r ON p.id = r.project_id
            ORDER BY p.created_at DESC;
        """)
        rows = await cursor.fetchall()
        projects = [dict(r) for r in rows]
    return success_response({"projects": projects, "count": len(projects)})

@router.post("")
@router.post("/ingest")
async def create_or_ingest_project(request: Request):
    from app.services.ingestion_service import IngestionService
    from app.services.indexer_service import IndexerService
    import tempfile

    content_type = request.headers.get("content-type", "").lower()
    name: Optional[str] = None
    source_type: str = "git_url"
    source_uri: Optional[str] = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        name = str(form.get("name")) if form.get("name") else None
        source_type = str(form.get("source_type", "zip"))
        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "filename"):
            tmp_dir = Path(tempfile.gettempdir()) / "parikshit_uploads"
            tmp_dir.mkdir(parents=True, exist_ok=True)
            tmp_zip = tmp_dir / f"{uuid.uuid4().hex}_{uploaded_file.filename}"
            content = await uploaded_file.read()
            tmp_zip.write_bytes(content)
            source_uri = str(tmp_zip.resolve())
            if not name:
                name = Path(uploaded_file.filename).stem
        else:
            source_uri = str(form.get("source_uri", ""))
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        name = body.get("name")
        source_type = body.get("source_type", "git_url")
        source_uri = body.get("source_uri")

    if not source_uri:
        return error_response("source_uri or file upload is required", code="INVALID_REQUEST", status_code=400)

    # Ingest repository
    ingest_res = await IngestionService.ingest_repository(
        source_type=source_type,
        source_uri=source_uri,
        name=name
    )

    # Immediately index revision for search, mentor, and digital twin
    index_res = await IndexerService.index_revision(ingest_res["revision_id"])

    return success_response({
        **ingest_res,
        "default_revision_id": ingest_res["revision_id"],
        "indexing": index_res
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

@router.get("/{project_id}/revisions")
async def list_project_revisions(project_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        p_cursor = await db.execute("SELECT id FROM projects WHERE id = ?;", (project_id,))
        if not await p_cursor.fetchone():
            return error_response(f"Project {project_id} not found", code="PROJECT_NOT_FOUND", status_code=404)

        rev_cursor = await db.execute(
            "SELECT * FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC;",
            (project_id,)
        )
        revisions = [dict(r) for r in await rev_cursor.fetchall()]

    return success_response({"revisions": revisions, "count": len(revisions)})
