import aiosqlite
from fastapi import APIRouter
from app.core.config import settings
from app.core.errors import success_response
from app.db.database import check_db_health, get_db_path
from app.agents.llm_gateway import LLMGateway

from app.services.ledger_service import LedgerService

router = APIRouter(tags=["Health & System"])

@router.get("/health")
async def health_check():
    db_ok = await check_db_health()
    llm_configured = LLMGateway.is_configured()
    
    try:
        ledger_res = await LedgerService.verify_chain(None)
        ledger_status = "verified" if ledger_res.get("valid") else "broken"
    except Exception:
        ledger_status = "unknown"

    sandbox_mode = "docker" if settings.SANDBOX_ENABLED else ("host" if settings.PARIKSHIT_ENV == "development" else "disabled")
    llm_mode = "mock" if settings.LLM_PROVIDER.lower() == "mock" else "real"
    
    status = "ok" if db_ok and ledger_status != "broken" else "degraded"
    
    return success_response({
        "status": status,
        "database": "ok" if db_ok else "unhealthy",
        "ledger_status": ledger_status,
        "sandbox": "enabled" if settings.SANDBOX_ENABLED else "disabled (local fallback)",
        "sandbox_mode": sandbox_mode,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_mode": llm_mode,
        "llm_ready": llm_configured,
        "environment": settings.PARIKSHIT_ENV,
        "version": settings.VERSION
    })

@router.get("/metrics")
async def get_system_metrics():
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        p_c = await db.execute("SELECT COUNT(*) FROM projects;")
        projects_count = (await p_c.fetchone())[0]
        t_c = await db.execute("SELECT COUNT(*) FROM tasks;")
        tasks_count = (await t_c.fetchone())[0]
        r_c = await db.execute("SELECT COUNT(*) FROM sandbox_runs;")
        runs_count = (await r_c.fetchone())[0]
        l_c = await db.execute("SELECT COUNT(*) FROM ledger_entries;")
        ledger_count = (await l_c.fetchone())[0]

    return success_response({
        "metrics": {
            "projects_total": projects_count,
            "tasks_total": tasks_count,
            "sandbox_runs_total": runs_count,
            "ledger_entries_total": ledger_count,
            "sandbox_enabled": 1 if settings.SANDBOX_ENABLED else 0
        }
    })

