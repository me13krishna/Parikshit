from fastapi import Request, HTTPException, Security
from fastapi.security import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.config import settings
from app.core.errors import error_response

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # If auth is disabled, allow all requests
        if settings.AUTH_DISABLED:
            return await call_next(request)

        # Allow public health and docs endpoints
        path = request.url.path
        if path in ["/", "/docs", "/redoc", "/openapi.json", "/api/v1/health"]:
            return await call_next(request)

        # Enforce API key check
        client_key = request.headers.get("X-API-Key")
        expected_key = settings.PARIKSHIT_API_KEY

        if not client_key or (expected_key and client_key != expected_key):
            cid = getattr(request.state, "correlation_id", None)
            return error_response(
                message="Unauthorized: valid X-API-Key header required",
                code="UNAUTHORIZED",
                status_code=401,
                correlation_id=cid
            )

        return await call_next(request)
