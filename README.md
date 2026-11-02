# BPO Intelligence

An evidence-led B2B research and CRM platform for a Kosovo-based outsourcing team of 10–20 agents. Target markets: US, Canada, UK, Australia, Germany, Austria, and Switzerland. Languages: English and German.

**Current scope: Phase 1 foundation.** The API and frontend start locally. No research, contacts, company records, scoring, or outreach are implemented yet. Navigation identifies the implementation phase for each future module. The market list is business configuration, not discovered companies. No fabricated leads are included.

## Requirements

- Python 3.12+ (verified here with Python 3.14.5).
- Node.js 22.18+ or 24+ and npm. The native Vite TypeScript config loader requires Node's built-in TypeScript support; verified with Node 24.14.0.
- PostgreSQL 17, either locally installed or through Docker Compose. Docker is optional for API/frontend startup.
- PostgreSQL credentials for database readiness. No external API keys are needed in Phase 1.

## Install (PowerShell, from the project root)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock
.\.venv\Scripts\python.exe -m pip install --no-deps -e './backend[dev]'
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
Set-Location frontend
npm ci --cache .npm-cache
Set-Location ..
```

Skip the `Copy-Item` steps when the destination already contains your settings. The backend lock is the resolved Windows/Python 3.14 development environment. On other systems or if a locked wheel is unavailable, install from the portable dependency ranges with `python -m pip install -e './backend[dev]'` and resolve a platform-specific lock. Do not commit `.env` files or credentials. Frontend installs use `package-lock.json`.

## Start the backend

In terminal 1, from the project root:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m app.serve
```

API: http://127.0.0.1:8000. Interactive API documentation: http://127.0.0.1:8000/docs. Stop with Ctrl+C. The entrypoint selects the Windows selector event loop required by Psycopg. On Linux/macOS use `../.venv/bin/python -m app.serve`.

## Start the frontend

In terminal 2, from the project root:

```powershell
Set-Location frontend
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to the backend. Restart Vite after changing `.env`. Only public configuration belongs in `VITE_*` variables; those values are bundled into browser code. The API health card, database readiness card, refresh control, market search/language filter, module navigation, and JSON status export work in Phase 1.

## Configure PostgreSQL

The API can start without a database. Liveness returns 200; readiness deliberately returns 503 until PostgreSQL is configured and reachable. No database schema is created in this phase.

With Docker installed:

```powershell
Copy-Item .env.example .env
# Edit .env and set a unique POSTGRES_PASSWORD before starting.
docker compose up -d postgres
```

Alternatively, provision a local PostgreSQL database and a dedicated application user. Set `DATABASE_URL` in `backend/.env` to match the actual credentials:

```dotenv
DATABASE_URL=postgresql+psycopg://bpo:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:5432/bpo_intelligence
```

Restart the backend. URL-encode special characters in the username/password. When accessing a remote database, use the server's required TLS settings (for example `?sslmode=verify-full` and its trusted certificate configuration). Compose binds PostgreSQL to loopback and persists data in a named volume. `docker compose down` stops it without deleting the data.

## Check health

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/live
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/ready
# Also verifies the frontend-to-backend development proxy:
Invoke-RestMethod http://127.0.0.1:5173/api/v1/health/live
```

Liveness: `{"status":"ok","service":"bpo-intelligence-api","version":"0.1.0"}`.

Readiness with PostgreSQL: `{"status":"ready","database":"connected"}` (HTTP 200). Without configuration: `{"status":"not_ready","database":"not_configured"}` (HTTP 503); connection failures return `database: "unavailable"`. PowerShell reports the expected 503 as an error. Database checks have a five-second time limit; raw driver errors and credentials are not returned.

## Verification

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m pytest -q
# Optional real database integration check (uses your configured test DB):
$env:TEST_DATABASE_URL = $env:DATABASE_URL
# Or set TEST_DATABASE_URL to an actual PostgreSQL connection string.
..\.venv\Scripts\python.exe -m pytest -q
Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
Set-Location ..\frontend
npm run build
```

Only set `TEST_DATABASE_URL` when a real database exists. This integration check executes `SELECT 1` and does not modify the database. The remaining tests isolate database behavior with mocks, including failure responses. `npm run build` performs strict TypeScript checking and creates `frontend/dist/`. `npm run preview` previews that build; it does **not** supply the development API proxy. Production hosting will need an `/api` reverse proxy or a configured API base URL and CORS policy.

See [verification results](docs/VERIFICATION.md), [architecture and development sequence](docs/ARCHITECTURE.md), and the [complete source-file inventory](docs/FILES.md).

Cloud deployment preparation for GitHub, Vercel, and Supabase is described in [DEPLOYMENT.md](docs/DEPLOYMENT.md). The root `vercel.json` routes the frontend and backend as two services in one Vercel project; actual deployment and database verification still require connected accounts.

## Environment variables

| Variable | Location | Purpose/default |
| --- | --- | --- |
| `APP_ENV` | backend | `development`, `test`, or `production`; production hides API docs |
| `LOG_LEVEL` | backend | `INFO`; accepts DEBUG, WARNING, ERROR, CRITICAL |
| `DATABASE_URL` | backend | Optional async PostgreSQL URL; blank means not configured |
| `DB_POOL_SIZE`, `DB_MAX_OVERFLOW` | backend | Per-instance connection limits; defaults `2` and `0` |
| `CORS_ORIGINS` | backend | JSON array of allowed browser origins; local frontend origins by default |
| `VITE_API_BASE_URL` | frontend | Public API prefix; `/api/v1` |
| `API_PROXY_TARGET` | frontend | Vite server proxy target; `http://127.0.0.1:8000` |
| `POSTGRES_DB` | root Compose | Database name |
| `POSTGRES_USER` | root Compose | Database user |
| `POSTGRES_PASSWORD` | root Compose | Required, user-supplied password |
| `TEST_DATABASE_URL` | test process | Optional real PostgreSQL test target |
| `OPENAI_API_KEY`, `SEARCH_PROVIDER`, `SEARCH_API_KEY`, `APOLLO_API_KEY` | backend | Reserved only; not consumed in Phase 1 |

## Phase gate and unfinished work

Phase 2 must wait until Phase 1 is verified against a real PostgreSQL instance. Docker and PostgreSQL were unavailable in the initial environment, so database readiness success and Compose execution could not be verified. Browser visual/interaction QA was not available; HTTP startup and a production frontend build were checked.

The full dashboard, models, migrations, CRUD, authentication, rate limiting, agent workers, search, OpenAI, contacts, outreach, suppression, exports of business data, and production deployment belong to subsequent phases. Alembic is installed but migrations are deliberately not initialized before Phase 2. The Compose file currently provisions only PostgreSQL; application container images and VPS deployment documentation arrive in Phase 7.

This foundation exposes only health endpoints and binds development servers to loopback. Authentication and production hardening must be implemented before exposing business data or deploying this application publicly.

If a restricted executor reports esbuild parent-directory access errors, run the development command in an ordinary local terminal with access to its project ancestry. Vite uses the native config loader to avoid an unnecessary config bundling step. Keep the project in a directory where your user has normal read access; do not run npm as Administrator as a workaround.

## Implementation references

- [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/): resource setup and cleanup.
- [SQLAlchemy Psycopg dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#module-sqlalchemy.dialects.postgresql.psycopg): async PostgreSQL engine.
- [Vite guide](https://vite.dev/guide/): frontend tooling.
