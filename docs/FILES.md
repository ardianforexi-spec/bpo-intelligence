# Created file inventory

All authored source/configuration/documentation files and dependency locks created for Phase 1 are listed below. No existing project files were present.

```text
.gitignore
.vercelignore
vercel.json
.env.example
compose.yaml
README.md
docs/ARCHITECTURE.md
docs/VERIFICATION.md
docs/FILES.md
docs/DEPLOYMENT.md
backend/.env.example
backend/.python-version
backend/pyproject.toml
backend/requirements.lock
backend/app/__init__.py
backend/app/main.py
backend/app/serve.py
backend/app/api/__init__.py
backend/app/api/health.py
backend/app/core/__init__.py
backend/app/core/config.py
backend/app/db/__init__.py
backend/app/db/session.py
backend/tests/test_health.py
frontend/.env.example
frontend/package.json
frontend/package-lock.json
frontend/index.html
frontend/tsconfig.json
frontend/vite.config.ts
frontend/src/vite-env.d.ts
frontend/src/main.tsx
frontend/src/App.tsx
frontend/src/styles.css
frontend/src/lib/api.ts
frontend/src/components/StatusCard.tsx
```

Generated, ignored installation and verification artifacts: `.venv/` (Python packages), `backend/*.egg-info/`, Python `__pycache__/` directories, `backend/.pytest_cache/`, `frontend/node_modules/`, `frontend/.npm-cache/`, `frontend/tsconfig.tsbuildinfo`, and `frontend/dist/`. The production output contains `index.html` plus bundled JavaScript and CSS assets with content hashes. These artifacts are reproducible from the source and dependency locks; individual third-party package files are not part of the authored source inventory.

No credential-bearing `.env` file was created. Copy the provided examples and enter your own settings as described in the README.
