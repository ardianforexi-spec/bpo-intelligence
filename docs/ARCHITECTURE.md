# Architecture

The application uses React + TypeScript + Vite, Supabase Auth and PostgreSQL, and a FastAPI backend hosted with the frontend through Vercel Services.

## User data

Browser → Supabase Auth → authenticated Data API → PostgreSQL grants and workspace RLS → browser.

All bpo_ business tables are private to signed-in workspace owners and members. Composite workspace/entity foreign keys prevent records from linking to another workspace's companies, contacts or campaigns. Workspace ownership is immutable to ordinary members; only owners can add verified existing users or remove access.

Privileged membership lookup lives in bpo_private with an explicit auth.uid() owner guard and empty search_path. The public RPC is a security-invoker wrapper. The scoring view uses security_invoker. Anonymous clients have no table privileges.

Business CRUD uses the Supabase Data API directly so client-side sessions are evaluated by the database. The FastAPI PostgreSQL connection remains server-only. Provider research actions authenticate against Supabase Auth and check workspace membership before using that connection.

## Research

Browser start → FastAPI session/membership check → rolling quota reservation → OpenAI background Responses web_search → saved provider response ID.

Browser refresh → authenticated backend → provider result → strict Pydantic schema + consulted URL checks → saved findings.

Explicit reviewed import → database row lock → domain deduplication → company/evidence/lead inserts in one transaction. Research output never marks evidence verified. An imported_at marker makes import idempotent even when all companies were duplicates.

The configured seven review tasks are carried out in one provider request. No arbitrary external tools, arbitrary URL fetcher, autonomous outreach sender or agent-written verified facts are exposed.

## Scoring and outreach

Each verified evidence category contributes at most once: hiring 25, company size 15, growth 15, potential demand 20, decision maker 10, verified contact 10, recent activity 5. Recent activity requires a date within 90 days. This is evidence coverage, not a probability or a claim of outsourcing intent.

Suppression is independent of contact records and survives their deletion/recreation. A new suppression withdraws existing drafts from approval. Database triggers reject new/approved drafts for suppressed contacts and require a verified business contact before approval. Contact verification changes invalidate prior approvals. The app never sends messages.

## Operational boundaries

Schema is managed through the versioned, ordered SQL migrations, not application startup. Authenticated client writes are audited by database triggers. Secrets stay in Vercel production; frontend contains only publishable configuration. Exports belong to the user and should be handled as private business data.

Health endpoints remain public and reveal only liveness/readiness. Provider endpoints require a verified, non-anonymous session. The UI never claims a provider is ready solely because a key exists: actual run failures are shown.

AI authorization also checks the verified workspace owner's email against the
server-only RESEARCH_OWNER_EMAIL configuration. An arbitrary public signup can use
its own isolated CRM workspace but cannot consume the application's paid OpenAI key.

