from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import aiosqlite
from pathlib import Path

from app.core.errors import success_response, error_response
from app.db.database import get_db_path
from app.services.ingestion_service import IngestionService
from app.services.indexer_service import IndexerService
from app.services.mentor_service import MentorService

router = APIRouter(prefix="/projects", tags=["Codebase Mentor"])

class IngestRequest(BaseModel):
    source_type: str = "git_url"  # git_url | local | zip
    source_uri: str
    name: Optional[str] = None

class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None

@router.post("/ingest")
async def ingest_and_index(req: IngestRequest):
    # 1. Ingestion
    ingest_res = await IngestionService.ingest_repository(
        source_type=req.source_type,
        source_uri=req.source_uri,
        name=req.name
    )

    # 2. Immediate Indexing
    index_res = await IndexerService.index_revision(ingest_res["revision_id"])

    return success_response({
        **ingest_res,
        "indexing": index_res
    }, status_code=201)

@router.get("/{project_id}/overview")
async def get_overview(project_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;",
            (project_id,)
        )
        rev = await cursor.fetchone()
        if not rev:
            return error_response("No revision found for project", code="NOT_FOUND", status_code=404)

        rev_id = rev["id"]

    overview = await MentorService.generate_architecture_overview(revision_id=rev_id)
    return success_response(overview)

@router.post("/{project_id}/chat")
async def chat_mentor(project_id: str, req: ChatRequest):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;",
            (project_id,)
        )
        rev = await cursor.fetchone()
        if not rev:
            return error_response("No indexed revision found for project", code="NOT_FOUND", status_code=404)

        rev_id = rev["id"]

    answer = await MentorService.ask_mentor(
        project_id=project_id,
        revision_id=rev_id,
        question=req.question,
        conversation_id=req.conversation_id
    )
    return success_response(answer)

@router.get("/{project_id}/tours")
async def get_tours(project_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;",
            (project_id,)
        )
        rev = await cursor.fetchone()
        if not rev:
            return error_response("No revision found for project", code="NOT_FOUND", status_code=404)
        rev_id = rev["id"]

    tours = await MentorService.generate_guided_tours(revision_id=rev_id)
    return success_response({"tours": tours})

@router.get("/{project_id}/files")
async def list_files(project_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT f.id, f.path, f.language, f.kind, f.line_count, f.size_bytes, f.importance_score
            FROM files f
            JOIN repo_revisions r ON f.revision_id = r.id
            WHERE r.project_id = ?
            ORDER BY f.importance_score DESC, f.path ASC;
            """,
            (project_id,)
        )
        rows = await cursor.fetchall()
        files = [dict(r) for r in rows]

    return success_response({"files": files, "count": len(files)})

@router.get("/{project_id}/file-content")
async def get_file_content(
    project_id: str,
    path: str,
    start_line: Optional[int] = Query(None),
    end_line: Optional[int] = Query(None)
):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT storage_path FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;",
            (project_id,)
        )
        rev = await cursor.fetchone()
        if not rev:
            return error_response("Project revision not found", code="NOT_FOUND", status_code=404)

        base_dir = Path(rev["storage_path"])
        target_file = (base_dir / path).resolve()

        # Security check: prevent directory traversal
        try:
            target_file.relative_to(base_dir.resolve())
        except ValueError:
            return error_response("Access denied: path escapes repository", code="FORBIDDEN", status_code=403)

        if not target_file.is_file():
            return error_response("File not found", code="FILE_NOT_FOUND", status_code=404)

        try:
            with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            
            s = start_line or 1
            e = end_line or len(lines)
            s_idx = max(1, s) - 1
            e_idx = min(len(lines), e)
            
            content = "".join(lines[s_idx:e_idx])
            return success_response({
                "path": path,
                "start_line": s_idx + 1,
                "end_line": e_idx,
                "total_lines": len(lines),
                "content": content
            })
        except Exception as exc:
            return error_response(f"Could not read file: {exc}", code="READ_ERROR", status_code=500)
