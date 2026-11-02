from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()
# Supabase requires encrypted Postgres traffic. Local PostgreSQL keeps its default behaviour.
connect_args = {"ssl": "require"} if "supabase.co" in settings.database_url else {}
engine = create_async_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session for future API endpoints."""
    async with AsyncSessionLocal() as session:
        yield session
