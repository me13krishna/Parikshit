from fastapi import APIRouter, Query
from typing import Optional
from app.core.errors import success_response, error_response
from app.services.ledger_service import LedgerService

router = APIRouter(tags=["Ledger"])

@router.get("/ledger")
async def get_ledger_entries(
    project_id: Optional[str] = Query(None, description="Optional project ID to filter by"),
    limit: int = Query(50, ge=1, le=200)
):
    entries = await LedgerService.list_entries(project_id=project_id, limit=limit)
    return success_response({
        "entries": entries,
        "count": len(entries)
    })

@router.get("/ledger/verify")
async def verify_ledger(project_id: Optional[str] = None):
    result = await LedgerService.verify_chain(project_id=project_id)
    return success_response(result)

@router.get("/ledger/export")
async def export_evidence_pack(project_id: Optional[str] = None):
    pack = await LedgerService.export_evidence_pack(project_id=project_id)
    return success_response(pack)

@router.get("/projects/{project_id}/ledger")
async def get_project_ledger(
    project_id: str,
    limit: int = Query(50, ge=1, le=200)
):
    entries = await LedgerService.list_entries(project_id=project_id, limit=limit)
    return success_response({
        "project_id": project_id,
        "entries": entries,
        "count": len(entries)
    })

@router.get("/projects/{project_id}/ledger/export")
async def export_project_ledger_pack(project_id: str):
    pack = await LedgerService.export_evidence_pack(project_id=project_id)
    return success_response(pack)
