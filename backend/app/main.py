"""Application factory and resource lifecycle."""

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router
from app.api.research import router as research_router
from app.core.config import Settings
from app.db.session import Database


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or Settings()
    logging.basicConfig(
        level=config.log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        database = Database(config)
        application.state.database = database
        try:
            yield
        finally:
            await database.close()

    application = FastAPI(
        title="BPO Intelligence API",
        version="0.1.0",
        description="Phase 1 infrastructure. CRM and research endpoints arrive in later phases.",
        lifespan=lifespan,
        docs_url="/docs" if config.app_env != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if config.app_env != "production" else None,
    )
    application.state.settings = config
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Accept", "Content-Type", "Authorization"],
    )
    application.include_router(router)
    application.include_router(research_router)
    return application


app = create_app()

