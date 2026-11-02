# BPO Intelligence

A shared, evidence-led prospecting and CRM workspace for a Kosovo outsourcing team of 10–20 agents, serving English and German markets.

Production: https://bpo-intelligence.vercel.app

## What works

- Supabase email/password sign-in, account confirmation, password recovery and sign-out.
- Separate workspaces, owner-managed team membership, and PostgreSQL row-level access control.
- Company and contact CRUD, domain/email deduplication, source URLs and verification status.
- Leads, campaign filters, follow-up dates, assigned teammate names and a stage-based pipeline.
- Evidence and hiring findings with acquisition dates, event dates and human verification.
- Evidence-coverage scores from verified categories, with each category counted once. Scores do not predict outsourcing intent.
- English/German outreach draft templates, editable review states and suppression. No automatic sending.
- Saved dashboard totals, pipeline and currency-separated analytics, activity history and target markets.
- Quoted UTF-8 CSV import/export, duplicate skipping, spreadsheet formula protection and JSON workspace archives.
- Optional OpenAI web research with saved background jobs, refresh/cancel, validated consulted sources and reviewed import into CRM.

Research results are never auto-verified. Unknowns stay blank. No fabricated leads are seeded.

## First use

1. Open production and choose Create an account.
2. Confirm your email, return to the app and sign in.
3. Create your workspace, or ask an existing workspace owner to add your verified account email under Settings.
4. Add a company or import companies from the CSV template, then add contacts and leads.
5. Record evidence and check each source before marking it verified. Use the pipeline to track next actions.
6. Draft outreach from a company, select a professional contact and review the text. A contact must be verified and unsuppressed before approving a draft.

## Cloud configuration

Vercel uses the repository root and vercel.json Services for the Vite frontend and FastAPI backend.

| Variable | Scope | Purpose |
| --- | --- | --- |
| DATABASE_URL | Sensitive, Production backend | Supabase Session pooler PostgreSQL URI; ordinary postgresql:// and postgresql+psycopg:// are supported |
| APP_ENV | Production backend | production |
| SUPABASE_URL | Backend | Supabase project HTTPS origin |
| SUPABASE_PUBLISHABLE_KEY | Backend | Public publishable key used to validate user sessions with Supabase Auth |
| VITE_SUPABASE_URL | Public frontend | Same project origin |
| VITE_SUPABASE_PUBLISHABLE_KEY | Public frontend | Publishable key, never service-role or secret key |
| VITE_API_BASE_URL | Public frontend | /api/v1 |
| OPENAI_API_KEY | Sensitive, Production backend | Optional provider key for research; never a VITE variable |
| OPENAI_MODEL | Backend | Optional model; default gpt-5-mini |
| RESEARCH_DAILY_LIMIT | Backend | Maximum starts per workspace per rolling 24 hours; default 20 |
| DB_POOL_SIZE / DB_MAX_OVERFLOW | Backend | 2 / 0 by default |

Supabase Auth → URL Configuration must use the real production origin as Site URL and allow the same origin in Redirect URLs for confirmation/recovery links. Configure a production email provider in Supabase when the built-in email delivery limits are insufficient. The application does not retrieve or reset database passwords.

Never commit credentials. The database key is server-only; public Supabase keys rely on RLS and table grants. Production credentials are not automatically copied to preview environments. Redeploy after changing Vercel variables.

## Database schema

The existing project received two additive migrations via the connected Supabase migration tool:

1. backend/schema.sql — normalized workspace/CRM tables, policies, audit triggers and scoring view.
2. backend/schema_hardening.sql — suppression lifecycle, stronger validation and privileged helper boundaries.

These are ordered SQL migrations. Apply them only once to a new intended Supabase project, in the listed order. Existing records in unrelated project tables are preserved. All application tables use the bpo_ prefix. Application startup never modifies the schema.

## Local setup

Requires Python 3.12+ (verified on 3.14), Node 24+, and npm.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock
.\.venv\Scripts\python.exe -m pip install --no-deps -e './backend[dev]'
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
# Fill the public Supabase project settings; keep database/API credentials server-side.
Set-Location frontend
npm ci --cache .npm-cache
npm run dev
```

Start the backend in a second terminal:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m app.serve
```

Vite serves http://127.0.0.1:5173 and proxies /api to the backend on port 8000. If that port is in use, choose another Vite port. Preview builds do not supply the development proxy.

## Verification

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m pytest -q
Set-Location ..\frontend
npm run build
node tests/public.smoke.mjs
```

The browser smoke test uses installed Chrome and defaults to the local preview at http://127.0.0.1:5174. It sends no signup emails. For another development URL set BPO_TEST_URL. Screenshots are ignored under qa-artifacts.

backend/tests/workspace_integration.sql verifies actual PostgreSQL CRUD, workspace isolation, composite foreign keys, scoring, suppression, member permissions and anonymous denial in a rollback transaction. It leaves no fixtures. The optional local TEST_DATABASE_URL test remains separate from hosted readiness checks.

## Research workflow and limits

Research starts only on a signed-in user's explicit action. The server revalidates the Supabase session and workspace membership, reserves a rate-limited job, and starts an OpenAI Responses background request. The browser refreshes saved job state while open; reopening the app resumes access to the same saved job. Provider timeouts and failures are visible. If a start request is interrupted before its provider response ID is saved, the job can remain Starting; starting another run consumes a new quota slot.

The seven research review tasks run in one bounded provider request. This is not seven autonomous workers or an unattended campaign scheduler. Jobs require an OpenAI API key, model access and credits. Provider output is treated as untrusted: structured validation and consulted-source matching happen before CRM import. Imported findings require human verification. No automatic sending, LinkedIn scraping, email guessing, scheduling or purchased contact enrichment is implemented.

CSV files are limited to 1,000 rows / 2 MB per import. Native .xlsx upload is not supported; save the spreadsheet as CSV first. A JSON archive is a download format, not a one-click database restore. Deal values are never summed across currencies.

See docs/CLOUD_STATUS.md for the latest deployment and verification evidence.

Paid AI access is restricted to workspaces owned by the verified account configured
in the server-only RESEARCH_OWNER_EMAIL setting. Public account registration does
not grant access to the server's OpenAI key. Team members must be added to that
owner's workspace. This setting was configured from the connected owner's account;
change it in Vercel if the BPO owner signs in with a different verified email.

