from fastapi import APIRouter, Query
from typing import Optional
from app.core.errors import success_response, error_response
from app.services.ledger_service import LedgerService

router = APIRouter(prefix="/ledger", tags=["Ledger"])

@router.get("")
async def get_ledger_entries(
    project_id: Optional[str] = Query(None, description="Optional project ID to filter by"),
    limit: int = Query(50, ge=1, le=200)
):
    entries = await LedgerService.list_entries(project_id=project_id, limit=limit)
    return success_response({
        "entries": entries,
        "count": len(entries)
    })

@router.get("/verify")
async def verify_ledger(project_id: Optional[str] = None):
    result = await LedgerService.verify_chain(project_id=project_id)
    return success_response(result)

@router.get("/export")
async def export_evidence_pack(project_id: Optional[str] = None):
    verification = await LedgerService.verify_chain(project_id=project_id)
    entries = await LedgerService.list_entries(project_id=project_id, limit=1000)
    
    evidence_pack = {
        "export_version": "2.0",
        "project_id": project_id,
        "verification_status": verification,
        "total_entries": len(entries),
        "ledger_entries": entries
    }
    return success_response(evidence_pack)
