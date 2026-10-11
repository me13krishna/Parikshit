from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.logging import logger, CorrelationIdMiddleware
from app.core.errors import error_response, AppError
from app.db.database import init_db
from app.services.ledger_service import LedgerService

# Routers
from app.api.health import router as health_router
from app.api.ledger import router as ledger_router
from app.api.projects import router as projects_router
from app.api.mentor import router as mentor_router
from app.api.tasks import router as tasks_router
from app.api.battles import router as battles_router
from app.api.twin import router as twin_router
from app.api.jobs import router as jobs_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Parikshit Backend Engine...")
    await init_db()
    # Ensure system genesis entry exists
    try:
        entries = await LedgerService.list_entries(limit=1)
        if not entries:
            await LedgerService.append_entry(
                event_type="system_initialized",
                payload={"version": "2.0.0", "message": "Parikshit Genesis Ledger Entry"}
            )
    except Exception as e:
        logger.error(f"Error checking/initializing genesis ledger: {e}")
    yield
    # Shutdown
    logger.info("Stopping Parikshit Backend Engine...")

app = FastAPI(
    title="Parikshit API",
    version="2.0.0",
    description="Grounded AI Engineering Teammate Backend (Team Vishwam)",
    lifespan=lifespan
)

from app.core.security import AuthMiddleware

# Middleware
cors_origins = [o.strip() for o in settings.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(AuthMiddleware)

# Error handlers
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    cid = getattr(request.state, "correlation_id", None)
    return error_response(
        message=exc.message,
        code=exc.code,
        status_code=exc.status_code,
        details=exc.details,
        correlation_id=cid
    )

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    cid = getattr(request.state, "correlation_id", None)
    return error_response(
        message="Request validation failed",
        code="VALIDATION_ERROR",
        status_code=422,
        details=exc.errors(),
        correlation_id=cid
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    cid = getattr(request.state, "correlation_id", None)
    logger.error(f"Unhandled server error [cid: {cid}]: {exc}", exc_info=True)
    return error_response(
        message="An unexpected internal server error occurred",
        code="INTERNAL_SERVER_ERROR",
        status_code=500,
        correlation_id=cid
    )

# Include Routers under /api/v1
app.include_router(health_router, prefix="/api/v1")
app.include_router(ledger_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(mentor_router, prefix="/api/v1")
app.include_router(tasks_router, prefix="/api/v1")
app.include_router(battles_router, prefix="/api/v1")
app.include_router(twin_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "name": "Parikshit Engine API",
        "version": "2.0.0",
        "docs_url": "/docs",
        "health_url": "/api/v1/health"
    }
