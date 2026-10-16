from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import aiosqlite
from pathlib import Path

from app.core.errors import success_response, error_response
from app.db.database import get_db_path
from app.services.mentor_service import MentorService

router = APIRouter(tags=["Codebase Mentor"])

class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None

class MentorDirectChatRequest(BaseModel):
    revision_id: Optional[str] = None
    project_id: Optional[str] = None
    question: str
    session_id: Optional[str] = None
    conversation_id: Optional[str] = None



@router.post("/mentor/chat")
async def direct_mentor_chat(req: MentorDirectChatRequest):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        rev = None
        if req.revision_id:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions WHERE id = ?;", (req.revision_id,))
            rev = await cursor.fetchone()
        if not rev and req.project_id:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;", (req.project_id,))
            rev = await cursor.fetchone()
        if not rev:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;")
            rev = await cursor.fetchone()
        if not rev:
            return error_response("No indexed revision found for project", code="NOT_FOUND", status_code=404)

        rev_id = rev["id"]
        proj_id = rev["project_id"]

    answer = await MentorService.ask_mentor(
        project_id=proj_id,
        revision_id=rev_id,
        question=req.question,
        conversation_id=req.session_id or req.conversation_id
    )
    return success_response(answer)

@router.get("/mentor/overview")
@router.get("/{project_id}/overview")
@router.get("/projects/{project_id}/overview")
async def get_overview(
    project_id: Optional[str] = None,
    revision_id: Optional[str] = Query(None)
):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        rev = None
        if revision_id:
            cursor = await db.execute("SELECT id FROM repo_revisions WHERE id = ?;", (revision_id,))
            rev = await cursor.fetchone()
        if not rev and project_id:
            cursor = await db.execute("SELECT id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;", (project_id,))
            rev = await cursor.fetchone()
        if not rev:
            cursor = await db.execute("SELECT id FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;")
            rev = await cursor.fetchone()
        if not rev:
            return success_response({
                "summary": "Connect a workspace or load the demo repository to explore architecture.",
                "entry_points": [],
                "core_modules": [],
                "key_data_flows": [],
                "dependencies": []
            })

        rev_id = rev["id"]

    overview = await MentorService.generate_architecture_overview(revision_id=rev_id)
    return success_response(overview)

@router.post("/{project_id}/chat")
async def chat_mentor(project_id: str, req: ChatRequest):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        rev = None
        if project_id:
            cursor = await db.execute(
                "SELECT id, project_id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;",
                (project_id,)
            )
            rev = await cursor.fetchone()
        if not rev:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;")
            rev = await cursor.fetchone()
        if not rev:
            return error_response("No indexed revision found for project", code="NOT_FOUND", status_code=404)

        rev_id = rev["id"]
        actual_pid = rev["project_id"]

    answer = await MentorService.ask_mentor(
        project_id=actual_pid,
        revision_id=rev_id,
        question=req.question,
        conversation_id=req.conversation_id
    )
    return success_response(answer)

@router.get("/mentor/tours")
@router.get("/{project_id}/tours")
@router.get("/projects/{project_id}/tours")
async def get_tours(
    project_id: Optional[str] = None,
    revision_id: Optional[str] = Query(None)
):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        rev = None
        if revision_id:
            cursor = await db.execute("SELECT id FROM repo_revisions WHERE id = ?;", (revision_id,))
            rev = await cursor.fetchone()
        if not rev and project_id:
            cursor = await db.execute("SELECT id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;", (project_id,))
            rev = await cursor.fetchone()
        if not rev:
            cursor = await db.execute("SELECT id FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;")
            rev = await cursor.fetchone()
        if not rev:
            return success_response({"tours": []})
        rev_id = rev["id"]

    tours = await MentorService.generate_guided_tours(revision_id=rev_id)
    return success_response({"tours": tours})

@router.get("/{project_id}/files")
@router.get("/projects/{project_id}/files")
async def list_files(project_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        rev = None
        if project_id:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;", (project_id,))
            rev = await cursor.fetchone()
        if not rev:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;")
            rev = await cursor.fetchone()
        
        target_pid = rev["project_id"] if rev else project_id
        cursor = await db.execute(
            """
            SELECT f.id, f.path, f.language, f.kind, f.line_count, f.size_bytes, f.importance_score
            FROM files f
            JOIN repo_revisions r ON f.revision_id = r.id
            WHERE r.project_id = ?
            ORDER BY f.importance_score DESC, f.path ASC;
            """,
            (target_pid,)
        )
        rows = await cursor.fetchall()
        files = [dict(r) for r in rows]

    return success_response({"files": files, "count": len(files)})

@router.get("/{project_id}/file-content")
@router.get("/projects/{project_id}/file-content")
async def get_file_content(
    project_id: str,
    path: str,
    start_line: Optional[int] = Query(None),
    end_line: Optional[int] = Query(None)
):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        rev = None
        if project_id:
            cursor = await db.execute(
                "SELECT storage_path FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;",
                (project_id,)
            )
            rev = await cursor.fetchone()
        if not rev:
            cursor = await db.execute(
                "SELECT storage_path FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;"
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

@router.get("/{project_id}/conversations")
@router.get("/projects/{project_id}/conversations")
async def list_conversations(project_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM conversations WHERE project_id = ? ORDER BY created_at DESC;",
            (project_id,)
        )
        rows = await cursor.fetchall()
        return success_response({"conversations": [dict(r) for r in rows]})

@router.get("/{project_id}/starter-tasks")
@router.get("/projects/{project_id}/starter-tasks")
async def get_starter_tasks(project_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT s.* FROM starter_tasks s
            JOIN repo_revisions r ON s.revision_id = r.id
            WHERE r.project_id = ?
            ORDER BY s.created_at DESC;
            """,
            (project_id,)
        )
        rows = [dict(r) for r in await cursor.fetchall()]
        if not rows:
            rows = [
                {
                    "id": f"stk_{project_id[:8]}_1",
                    "title": "Explore codebase entrypoints and data model",
                    "rationale": "High-impact onboarding starting point",
                    "risk_level": "low",
                    "status": "open"
                },
                {
                    "id": f"stk_{project_id[:8]}_2",
                    "title": "Run test suite and verify test coverage",
                    "rationale": "Verify baseline reliability in sandbox",
                    "risk_level": "low",
                    "status": "open"
                }
            ]
        return success_response({"starter_tasks": rows})

@router.get("/{project_id}/symbols")
@router.get("/projects/{project_id}/symbols")
async def search_symbols(
    project_id: str,
    q: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        if q:
            cursor = await db.execute(
                """
                SELECT s.id, s.name, s.kind, s.start_line, s.end_line, s.signature, f.path
                FROM symbols s
                JOIN files f ON s.file_id = f.id
                JOIN repo_revisions r ON f.revision_id = r.id
                WHERE r.project_id = ? AND s.name LIKE ?
                LIMIT ?;
                """,
                (project_id, f"%{q}%", limit)
            )
        else:
            cursor = await db.execute(
                """
                SELECT s.id, s.name, s.kind, s.start_line, s.end_line, s.signature, f.path
                FROM symbols s
                JOIN files f ON s.file_id = f.id
                JOIN repo_revisions r ON f.revision_id = r.id
                WHERE r.project_id = ?
                LIMIT ?;
                """,
                (project_id, limit)
            )
        rows = [dict(r) for r in await cursor.fetchall()]
        return success_response({"symbols": rows, "count": len(rows)})
