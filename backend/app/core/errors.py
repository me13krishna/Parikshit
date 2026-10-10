import uuid
from typing import Any, Optional
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None
    correlation_id: str

class APIResponse(BaseModel):
    ok: bool
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None

class AppError(Exception):
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Optional[Any] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details

def error_response(
    message: str,
    code: str = "BAD_REQUEST",
    status_code: int = 400,
    details: Optional[Any] = None,
    correlation_id: Optional[str] = None
) -> JSONResponse:
    cid = correlation_id or f"corr_{uuid.uuid4().hex[:12]}"
    content = {
        "ok": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "correlation_id": cid
        }
    }
    return JSONResponse(status_code=status_code, content=content)

def success_response(data: Any = None, status_code: int = 200) -> JSONResponse:
    content = {
        "ok": True,
        "data": data,
        "error": None
    }
    return JSONResponse(status_code=status_code, content=content)
