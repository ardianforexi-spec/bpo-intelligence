# BPO Intelligence

A production-oriented foundation for a B2B outsourcing intelligence and CRM platform. Phase 1 supplies a separated FastAPI API, React/Vite dashboard shell, PostgreSQL-ready configuration, Docker setup, and documented health checks.

## Project layout

```text
backend/              FastAPI application and Python tooling
  app/
    api/routes/       HTTP endpoints
    core/             Settings, logging, security primitives
    db/               Database engine/session foundation
    main.py           Application factory
frontend/             React + Vite + TypeScript dashboard shell
infra/                Deployment-oriented configuration (reserved)
docker-compose.yml    Local API, web client, and PostgreSQL stack
```

## Prerequisites

- Python 3.12 or later
- Node.js 20 or later (includes npm)
- PostgreSQL 16, or Docker Desktop for the containerised stack

## Local setup

1. Copy `.env.example` to `.env` and change values appropriate to your environment.
2. Set up the backend:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e ".[dev]"
   uvicorn app.main:app --reload --port 8000
   ```

3. In a second terminal, set up the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The API is available at `http://localhost:8000` and the dashboard at `http://localhost:5173`.

## Health check

With the backend running:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/health
```

Expected response:

```json
{"status":"ok","service":"bpo-intelligence-api","environment":"development"}
```

Interactive OpenAPI documentation is at `http://localhost:8000/docs`.

## Docker

After configuring `.env`, run:

```powershell
docker compose up --build
```

This launches PostgreSQL, the API on port 8000, and the dashboard on port 5173.

## Phase 1 scope and next steps

Phase 2 CRM foundations include normalized Company, Contact, Lead, research-source and hiring-signal models plus initial CRUD endpoints. Before use, point `DATABASE_URL` to Supabase Postgres and run `alembic upgrade head`. Authentication, research agents, external integrations, AI, outreach, and analytics are deliberately deferred until their respective phases.

Never add provider credentials to source control; use `.env` or your deployment secret manager.
