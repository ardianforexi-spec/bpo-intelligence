# Source inventory

The repository contains the Vercel Services definition, local PostgreSQL Compose file,
README, architecture/deployment/verification documents, the FastAPI backend and the
React/Vite frontend.

Backend application:

- app/core/config.py: validated server configuration, PostgreSQL URI normalization.
- app/db/session.py: async database lifecycle and bounded connection pool.
- app/api/health.py: liveness and database readiness.
- app/api/research.py: authenticated, quota-limited background research and reviewed import.
- app/main.py, app/serve.py: application factory and local launcher.
- schema.sql, schema_hardening.sql: ordered database migrations applied via Supabase.
- tests/test_health.py, tests/test_research.py, tests/workspace_integration.sql.

Frontend application:

- src/App.tsx: sessions, workspace selection, navigation and data orchestration.
- src/lib/supabase.ts: public client, typed record access, exports and safe CSV handling.
- src/lib/modules.ts: module forms, pipeline stages, service and market configuration.
- src/components/AuthScreen.tsx: login, signup and recovery.
- src/components/DataPanels.tsx: record tables, dashboard, pipeline, analytics and activity.
- src/components/RecordEditor.tsx: accessible record dialogs and draft templates.
- src/components/CompanyProfile.tsx: company evidence/contact profile and score breakdown.
- src/components/ResearchPanel.tsx: saved jobs, progress, findings review and import.
- src/components/WorkspaceSettings.tsx: team, account, CSV import, markets and exports.
- src/lib/api.ts and src/components/StatusCard.tsx: original health helpers retained.
- src/styles.css, src/workspace.css: branding, responsive layout and component styles.
- tests/public.smoke.mjs, tests/workspace.smoke.mjs: headless Chrome UI/CSV checks.

Dependency manifests/locks, TypeScript/Vite configuration and environment examples are
tracked. Credential files, node_modules, .venv, dist, caches, QA browser artifacts and
local QA state are ignored and never included in publication.

