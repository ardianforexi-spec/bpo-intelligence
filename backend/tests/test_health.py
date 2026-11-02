import os
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client():
    settings = Settings(_env_file=None, app_env="test", database_url=None)
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def test_liveness_without_database(client):
    response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_reports_missing_database(client):
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "not_ready", "database": "not_configured"}


def test_readiness_checks_database(client):
    client.app.state.database = AsyncMock(engine=object())
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json()["database"] == "connected"
    client.app.state.database.ping.assert_awaited_once()


def test_database_error_is_sanitized(client):
    client.app.state.database = AsyncMock(engine=object())
    client.app.state.database.ping.side_effect = RuntimeError("secret-password")
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert response.json()["database"] == "unavailable"
    assert "secret-password" not in response.text


def test_cors_allows_local_frontend(client):
    response = client.get("/api/v1/health/live", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_does_not_allow_other_origins(client):
    response = client.get("/api/v1/health/live", headers={"Origin": "https://untrusted.example"})
    assert "access-control-allow-origin" not in response.headers


def test_database_settings_require_postgres():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url="sqlite:///local.db")


def test_supabase_uri_uses_psycopg_and_tls():
    settings = Settings(
        _env_file=None,
        database_url="postgresql://postgres.example:test%40password@aws-0-eu-west-2.pooler.supabase.com:5432/postgres",
    )
    assert settings.database_url.get_secret_value() == (
        "postgresql+psycopg://postgres.example:test%40password@"
        "aws-0-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require"
    )


def test_explicit_database_tls_is_preserved():
    uri = "postgresql+psycopg://user:secret@aws-0-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=verify-full"
    assert Settings(_env_file=None, database_url=uri).database_url.get_secret_value() == uri


def test_invalid_database_url_is_hidden_in_validation_errors():
    with pytest.raises(ValidationError) as caught:
        Settings(_env_file=None, database_url="mysql://user:private-password@db.example/test")
    assert "private-password" not in str(caught.value)


def test_production_hides_docs():
    with TestClient(create_app(Settings(_env_file=None, app_env="production", database_url=None))) as client:
        assert client.get("/docs").status_code == 404


@pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL"), reason="Requires PostgreSQL")
def test_real_postgres_readiness():
    settings = Settings(_env_file=None, app_env="test", database_url=os.environ["TEST_DATABASE_URL"])
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/v1/health/ready").json() == {
            "status": "ready", "database": "connected"
        }

