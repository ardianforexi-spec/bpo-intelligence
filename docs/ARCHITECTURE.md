# Architecture and delivery sequence

## Phase 1: current foundation

```text
Browser (React + TypeScript + Tailwind)
    → Vite /api development proxy
        → FastAPI /api/v1
            → SQLAlchemy async engine + Psycopg
                → PostgreSQL
```

Frontend and backend are independent packages. The API factory accepts explicit settings for tests. A lifespan-owned database engine and async session factory provide connection pooling and disposal. No import-time network calls occur. Health endpoints separate API process liveness from database readiness. The frontend reports actual health responses; configured markets and services are explicitly distinct from research results.

The UI implements responsive navigation, system status, refresh/error/loading states, market filtering, and JSON status export. Future modules have roadmap screens. It contains no fake leads or invented performance statistics.

The initial workspace was empty and had no Git metadata or repository instructions. Available runtimes were Python 3.14.5 and Node 24.14.0/npm 11.9.0. Docker and PostgreSQL executables/services were not found.

## Intended extension points

- `backend/app/api/`: versioned HTTP routes and request/response schemas.
- `backend/app/core/`: settings, logging, and later authentication/rate limiting.
- `backend/app/db/`: async sessions; later declarative models and migrations.
- Future `backend/app/agents/`: seven independently testable agent roles, orchestrated by a research service rather than conversational agents with arbitrary write access.
- Future `backend/app/integrations/`: search-provider adapters, OpenAI, Apollo, permitted public sources.
- Future `backend/app/workers/`: durable queued campaign jobs with progress, retries, cancellation, and persisted run logs.
- `frontend/src/components/`: reusable UI; `frontend/src/lib/`: typed API access.

## Delivery sequence

| Phase | Scope | Verification gate |
| --- | --- | --- |
| 1 | Package setup, settings, connection, health, UI shell, documentation | Backend tests, build, HTTP startup/proxy, real PostgreSQL readiness |
| 2 | Normalized companies, contacts, leads, services, sources, signals, campaigns, agent runs, outreach, activities, users; Alembic; CRM CRUD | PostgreSQL migration and CRUD tests, deduplication and validation |
| 3 | Campaign filters, configurable search, company intelligence, public hiring evidence | Provider contract tests; provenance, dates, unknowns, robots/terms handling |
| 4 | OpenAI structured analysis, seven agent roles, service matching, weighted 0–100 scoring | Scoring tests and evaluation against source evidence; no invented facts |
| 5 | Public professional contact research, outreach drafts in English/German, campaign management | Verification status, suppression, approval state; no automatic sending |
| 6 | Dashboard records, analytics, pagination, CSV/Excel import/export | API/UI integration, accurate aggregates, safe file processing |
| 7 | Full testing, security review, application containers, VPS deployment | Authentication, access controls, backup/recovery, TLS, deployment checks |

Authentication must land before business-data endpoints become accessible beyond local development, regardless of the formal security review phase.

## Data and agent design constraints for later phases

Every finding needs a source URL, acquisition date, and verification status. Unknown facts remain unknown. Hiring is a potential demand signal and never proof of outsourcing intent. A 10–20 agent delivery capacity must inform qualification and suggested deal size. Initial score weights are hiring 25, size 15, growth 15, potential demand 20, decision maker 10, verified business contact 10, and recent activity 5. Each awarded component must carry an evidence-backed explanation.

Company deduplication should use normalized domains plus reviewed exceptions. Contact deduplication should use scoped normalized professional identifiers; verification and suppression must survive merges. Suppression applies before contact selection or draft workflows. All generated messages remain drafts for human review. Do not add outbound sending without explicit authorization and an implemented approval workflow.

Privacy and outreach requirements in the project brief remain requirements for later implementation, not compliance claims for this foundation. Assess applicable jurisdictions, lawful basis, minimization, retention, deletion, suppression, and contact channels before data collection/outreach features are enabled. Use approved APIs or permitted public sources; do not bypass access controls or scrape LinkedIn.

## Missing configuration

Required now for the remaining Phase 1 gate: a running PostgreSQL instance and its `DATABASE_URL`. Optional now: Docker for the supplied database service. Required later: selected search provider and key, OpenAI configuration, optionally Apollo, deployment hostname/TLS, user authentication, and jurisdiction-specific data handling/outreach policy. No provider is contacted in Phase 1.
