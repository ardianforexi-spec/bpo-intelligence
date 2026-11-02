# GitHub → Vercel → Supabase

Deployment preparation is included; cloud projects are not created until account connections are available. This document does not establish a deployed URL or a working cloud database.

## GitHub

Use a private repository named `bpo-intelligence` unless the owner specifies otherwise. Push the project root so it contains both `frontend/` and `backend/`. Exclude credentials, virtual environments, package caches, local Vercel state, and build outputs. A local Git repository can be initialized before account authorization; a remote repository and push require access to the intended GitHub account. Use the account's confirmed author identity for commits.

## Vercel

Import the repository with its **Root Directory set to the repository root**, not `frontend/`. The root `vercel.json` uses Vercel Services (currently beta) to build the Vite frontend and FastAPI backend separately and route them under the same domain:

- `/api/*` → FastAPI, preserving the request path.
- Everything else → Vite frontend.

Keep Node on version 24. Python is declared as 3.14 in `backend/.python-version`, matching the locally verified runtime. The backend service points to `app.main:app`. The frontend build uses `npm run build` and outputs `dist`.

Set these environment variables for the initial hosted environment:

| Name | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `LOG_LEVEL` | `INFO` |
| `DATABASE_URL` | Blank initially; replace with the secret Supabase connection URL later |
| `DB_POOL_SIZE` | `2` |
| `DB_MAX_OVERFLOW` | `0` |
| `VITE_API_BASE_URL` | `/api/v1` |

`CORS_ORIGINS` is only needed for additional browser origins; the public app uses the same origin as its API. Do not copy production database credentials into preview environments by default. Choose a separate development database when preview environments need persistence.

A first deployment without a database can pass liveness while readiness returns 503. Redeploy after setting the Supabase URL. The existing foundation exposes only health endpoints; business-data routes and authentication remain future work.

## Supabase

Create `bpo-intelligence` in the intended organization, preferably in an EU region near the hosting region. Use a Free project when available; do not authorize paid upgrades implicitly. Choose a unique database password and keep it in the account's secret storage and the server environment.

For the initial connection, use **Connect → Session pooler**, which supports IPv4. Copy the exact hostname, project-specific username and port from the dashboard. Convert the URL scheme from `postgresql://` to `postgresql+psycopg://` for SQLAlchemy. URL-encode the password and enable TLS with `sslmode=require` at minimum; use certificate verification and Supabase's CA configuration when available for the runtime.

```text
postgresql+psycopg://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=require
```

The placeholders are not usable credentials. A Supabase project URL or publishable key is not a PostgreSQL connection string. No Supabase key or database password belongs in `VITE_*` settings. Session mode works with this Psycopg configuration; changing to transaction mode requires reviewing prepared statements and connection behavior.

No CRM tables are created in Phase 1. Avoid enabling public database access for future tables without deliberate privileges and row-level-security policies. A dedicated application database role and its privileges should be introduced with schema/access design in Phase 2.

## Final verification

After deployment, verify the real returned Vercel URL:

1. `/` serves the dashboard and its JS/CSS.
2. `/api/v1/health/live` returns 200 with `status: ok`.
3. `/api/v1/health/ready` returns 200 with `database: connected` after the Supabase URL is configured.
4. Set `TEST_DATABASE_URL` securely in the local test process and run the optional PostgreSQL integration test.

Do not mark the remaining Phase 1 database gate complete until these checks pass. Campaign workers are not part of this deployment or Phase 1.

References: [Vercel Services](https://vercel.com/docs/services), [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi), [Python runtime versions](https://vercel.com/docs/functions/runtimes/python/python-version), [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
