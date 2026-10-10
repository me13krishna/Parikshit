import time
import uuid
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s", "level":"%(levelname)s", "module":"%(name)s", "msg":"%(message)s"}'
)
logger = logging.getLogger("parikshit")

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("X-Correlation-ID") or f"corr_{uuid.uuid4().hex[:12]}"
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        logger.info(f"Incoming request {request.method} {request.url.path} [cid: {correlation_id}]")
        
        response = await call_next(request)
        
        duration = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Correlation-ID"] = correlation_id
        logger.info(f"Completed {request.method} {request.url.path} -> {response.status_code} in {duration}ms [cid: {correlation_id}]")
        
        return response
