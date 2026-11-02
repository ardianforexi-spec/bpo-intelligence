"""Separate process liveness from dependency readiness."""

import asyncio
import logging
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/health", tags=["health"])


class Liveness(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "bpo-intelligence-api"
    version: str = "0.1.0"


class Readiness(BaseModel):
    status: Literal["ready", "not_ready"]
    database: Literal["connected", "not_configured", "unavailable"]


@router.get("/live", response_model=Liveness)
async def live() -> Liveness:
    return Liveness()


@router.get("/ready", response_model=Readiness, responses={503: {"model": Readiness}})
async def ready(request: Request) -> Readiness | JSONResponse:
    database = request.app.state.database
    if database.engine is None:
        result = Readiness(status="not_ready", database="not_configured")
        return JSONResponse(status_code=503, content=result.model_dump())
    try:
        await asyncio.wait_for(database.ping(), timeout=5)
    except Exception:
        # Do not expose connection URLs, passwords, or raw driver exceptions.
        logger.warning("PostgreSQL readiness check failed")
        result = Readiness(status="not_ready", database="unavailable")
        return JSONResponse(status_code=503, content=result.model_dump())
    return Readiness(status="ready", database="connected")
