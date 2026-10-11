import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import aiosqlite
from app.db.database import get_db_path
from app.core.errors import success_response, error_response

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/{job_id}")
async def get_job_status(job_id: str):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM jobs WHERE id = ?;", (job_id,))
        job = await cursor.fetchone()
        if not job:
            return error_response(f"Job {job_id} not found", code="JOB_NOT_FOUND", status_code=404)
        return success_response(dict(job))

@router.get("/{job_id}/events")
async def get_job_events(job_id: str):
    async def event_generator():
        yield f"event: job_status\ndata: {json.dumps({'id': job_id, 'status': 'connected'})}\n\n"
        db_path = get_db_path()
        for _ in range(3):
            await asyncio.sleep(0.5)
            async with aiosqlite.connect(db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("SELECT * FROM jobs WHERE id = ?;", (job_id,))
                job = await cursor.fetchone()
                if job:
                    yield f"event: job_update\ndata: {json.dumps(dict(job))}\n\n"
                    if job["status"] in ["succeeded", "failed", "cancelled"]:
                        break
                else:
                    yield f"event: job_update\ndata: {json.dumps({'id': job_id, 'status': 'complete'})}\n\n"
                    break
        yield f"event: done\ndata: {json.dumps({'id': job_id, 'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
