from functools import lru_cache
from typing import Annotated, Literal

from pydantic import AnyHttpUrl, BeforeValidator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_origins(value: object) -> object:
    """Accept a comma-separated origin list in .env files."""
    if isinstance(value, str) and not value.lstrip().startswith("["):
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    return value


CorsOrigins = Annotated[list[AnyHttpUrl], BeforeValidator(parse_origins)]


class Settings(BaseSettings):
    """Environment-backed application configuration."""

    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "BPO Intelligence API"
    app_env: Literal["development", "test", "staging", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    log_level: str = "INFO"
    database_url: str = "postgresql+asyncpg://bpo_user:change-me@localhost:5432/bpo_intelligence"
    backend_cors_origins: CorsOrigins = Field(default_factory=lambda: ["http://localhost:5173"])


@lru_cache
def get_settings() -> Settings:
    return Settings()
