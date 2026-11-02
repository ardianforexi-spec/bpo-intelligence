# GitHub → Vercel → Supabase

Production: https://bpo-intelligence.vercel.app
Source branch: https://github.com/ardianforexi-spec/bpo-intelligence/tree/deploy/workspace-2026-11-02
Supabase project: ghqimzognkumxfybnucg (JEEPSERVICE 4X4, eu-west-2).

## Publishing

Keep Vercel's project root at the repository root. vercel.json uses Vercel Services
(beta) to build frontend/ as Vite and backend/ as FastAPI, with /api/* routed to
the backend and all remaining paths to the frontend. Node 24.x is pinned by the
frontend package. Python 3.14 is declared by backend/.python-version.

The existing GitHub main contains a separate older implementation. Publish and
deploy the explicit workspace branch and commit rather than replacing main.
The local repository still has its original staged sources, no commits and no
remote; connected GitHub API publication supplies the actual source history.

## Environment

Use the variables documented in README.md. DATABASE_URL and OPENAI_API_KEY are
Sensitive and Production-only. The public frontend uses only VITE_SUPABASE_URL,
VITE_SUPABASE_PUBLISHABLE_KEY and VITE_API_BASE_URL. Redeploy after editing Vercel
variables. Never copy production secrets into previews automatically.

The existing sensitive DATABASE_URL is the real Supabase Session pooler URI.
Both postgresql:// and postgresql+psycopg:// are accepted; the application chooses
Psycopg and defaults Supabase pooler TLS to sslmode=require when unspecified.
Do not put the connection URL or password in chat, GitHub or frontend settings.

## Authentication

In Supabase Authentication → URL Configuration, set Site URL to
https://bpo-intelligence.vercel.app and allow that origin in Redirect URLs.
Account-confirmation and recovery links depend on this provider setting.
The browser persists/refreshes sessions through the official Supabase client.
Workspace RLS and explicit grants guard every business table. Only owners can
add existing verified teammate emails to the workspace. No invitation email is sent.

## Database

The ordered schema.sql and schema_hardening.sql migrations were applied to the
intended project through Supabase's migration tool. All CRM objects use bpo_ names.
For another project, apply those files once in order; never apply them blindly to
an existing schema. Application startup does not create or modify tables.

## AI research

Set OPENAI_API_KEY in Vercel Production and redeploy. Optional OPENAI_MODEL defaults
to gpt-5-mini. The provider account needs model access and credits. The server
reserves at most RESEARCH_DAILY_LIMIT starts per workspace per rolling 24 hours.
OpenAI background responses persist work beyond one serverless request; poll or
cancel through the authenticated API. Results are source-checked and imported only
after human review. Findings start unverified. No messages are sent by this app.

## Verification

Check the actual production alias after deployment:

- / serves the sign-in UI and its JS/CSS assets.
- /api/v1/health/live returns 200 and status ok.
- /api/v1/health/ready returns 200 and database connected.
- /api/v1/capabilities reports whether auth and the research key are configured.
- Sign in, create/select a workspace, add a company and contact, and check persistence.
- Add verified evidence, check scoring, move a lead and verify suppression blocks approval.
- With a provider key, start/refresh one narrow research run and review its consulted sources.

Keep local credentials, QA sessions, downloaded data and browser artifacts out of
source control. docs/VERIFICATION.md and docs/CLOUD_STATUS.md record actual checks
and any remaining live-provider or account-level verification limits.

