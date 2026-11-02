# Current cloud status — 2 November 2026

## Baseline already verified

Production is https://bpo-intelligence.vercel.app, Vercel project prj_b6kzWFUhOWL59aXejFqO83IduHMF,
team team_7LQvDMPuregqxcW8okV9qs8G. Supabase project ghqimzognkumxfybnucg belongs to
JEEPSERVICE 4X4 and is ACTIVE_HEALTHY. Hosted readiness previously returned database: connected.

## CRM implementation

The workspace branch deploy/workspace-2026-11-02 now contains the CRM/authentication
implementation under active verification. Both ordered SQL migrations have been applied
successfully to the existing Supabase project. Unrelated project data was preserved.

Completed checks:

- 15 backend tests passed; 1 optional local PostgreSQL test skipped.
- Real PostgreSQL rollback tests passed for CRUD, RLS workspace isolation, composite
  workspace foreign keys, suppression, scoring, member permissions and anonymous denial.
- Supabase security advisors returned zero findings after access hardening.
- Frontend strict TypeScript and production Vite build passed.
- Headless Chrome checked sign-in/signup/reset screen navigation, quoted CSV parsing,
  spreadsheet formula protection and mobile layout, without sending signup emails.
- Public Supabase URL/publishable-key settings were configured for production frontend
  and backend. DATABASE_URL remains Sensitive and Production-only.

Pending checks/configuration:

- OPENAI_API_KEY was absent from Vercel's latest metadata check. AI web research cannot
  be live-tested until the user configures a funded, authorized key and the app redeploys.
- A persistent temporary production Auth test account was rejected by automatic
  approval review. Explicit user approval was requested before creating it. No such
  account was created by that rejected operation. Rollback-only database fixtures were
  used successfully and left no test data.
- Supabase Auth Site URL / Redirect URLs must point at the production origin for
  confirmation and password-recovery links. Built-in email delivery quotas still apply.

The app implements editable reviewed drafts and never sends messages. It supports CSV,
not native XLSX upload. Research uses seven review tasks in one bounded background
provider request, not seven autonomous scheduled workers. These boundaries are explicit
in the README and product flow; they are not claimed as completed unsupported features.

## CRM production deployment verified

Deployment dpl_E6kbUWEBaEAyXwr2rxavgED64u51 is READY from commit
f36fd5d4c53f3c96458095b7baa3bb6d32dc0275. Production / and all referenced JS/CSS
assets returned HTTP 200; liveness returned status=ok; readiness returned
status=ready, database=connected. Capabilities returned auth=true and research=false.

An additional isolated browser fixture test passed company/contact forms, company
profile, all navigation modules, mobile layout and browser-exception checks. Supabase
calls were intercepted for this UI test; actual access controls and CRUD were tested
separately in the real rollback SQL transaction. Full real-account UI verification
remains pending explicit test-account approval or the user's own signed-in test.

