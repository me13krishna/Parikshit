from fastapi import APIRouter
from app.core.config import settings
from app.core.errors import success_response
from app.db.database import check_db_health
from app.agents.llm_gateway import LLMGateway

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    db_ok = await check_db_health()
    llm_configured = LLMGateway.is_configured()
    
    status = "ok" if db_ok else "degraded"
    
    return success_response({
        "status": status,
        "database": "ok" if db_ok else "unhealthy",
        "sandbox": "enabled" if settings.SANDBOX_ENABLED else "disabled (local fallback)",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_ready": llm_configured,
        "environment": settings.PARIKSHIT_ENV,
        "version": "2.0.0"
    })
