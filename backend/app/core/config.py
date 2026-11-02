"""Validated configuration loaded independently of the launch directory."""

from pathlib import Path
from typing import Literal
from uuid import UUID

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    app_env: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    database_url: SecretStr | None = None
    supabase_url: str = "https://ghqimzognkumxfybnucg.supabase.co"
    supabase_publishable_key: str = ""
    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-5-mini"
    research_daily_limit: int = Field(default=20, ge=1, le=500)
    research_owner_email: str = ""
    research_reconcile_run_id: UUID | None = None

    @field_validator('research_reconcile_run_id',mode='before')
    @classmethod
    def empty_reconcile_run(cls,value:object)->object:
        return None if value=='' else value
    db_pool_size: int = Field(default=2, ge=1, le=20)
    db_max_overflow: int = Field(default=0, ge=0, le=20)
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("database_url", mode="before")
    @classmethod
    def empty_database_url(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None:
            try:
                url = make_url(value.get_secret_value())
                if url.drivername == "postgresql":
                    url = url.set(drivername="postgresql+psycopg")
                valid = (
                    url.drivername == "postgresql+psycopg"
                    and bool(url.host)
                    and bool(url.database)
                )
            except Exception:
                valid = False
            if not valid:
                raise ValueError("DATABASE_URL must be a postgresql+psycopg URL with host and database")
            if url.host and url.host.endswith(".supabase.com") and "sslmode" not in url.query:
                url = url.update_query_dict({"sslmode": "require"})
            return SecretStr(url.render_as_string(hide_password=False))
        return value

