"""Async PostgreSQL engine and session factory owned by the application lifespan."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings


class Database:
    def __init__(self, settings: Settings) -> None:
        self.engine: AsyncEngine | None = None
        self.sessions: async_sessionmaker[AsyncSession] | None = None
        if settings.database_url:
            self.engine = create_async_engine(
                settings.database_url.get_secret_value(),
                pool_pre_ping=True,
                pool_size=settings.db_pool_size,
                max_overflow=settings.db_max_overflow,
                connect_args={"connect_timeout": 3},
                hide_parameters=True,
            )
            self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def ping(self) -> None:
        if self.engine is None:
            raise RuntimeError("Database is not configured")
        async with self.engine.connect() as connection:
            await connection.execute(text("SELECT 1"))

    async def close(self) -> None:
        if self.engine is not None:
            await self.engine.dispose()
