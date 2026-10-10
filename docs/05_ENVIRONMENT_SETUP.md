# Parikshit – Environment Setup & Configuration Guidelines

**Version:** 2.0  

---

## 1. Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| OS | Linux / macOS / Windows + WSL2 | Docker required |
| Docker | 24+ | Docker Desktop or engine |
| Node.js | 20 LTS | for Next.js frontend |
| Python | 3.11+ | for FastAPI backend |
| Git | 2.40+ | |
| Disk | ≥ 10 GB free | for repos + Docker images |
| RAM | ≥ 8 GB (16 GB recommended) | sandbox + LLM |

Optional but recommended:
- `uv` or `poetry` for Python dependency management
- `pnpm` or `npm` for frontend

---

## 2. Repository Layout (Recommended)

```
parikshit/
├── frontend/                 # Next.js App Router
├── backend/                  # FastAPI
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── agents/
│   │   ├── models/           # SQLAlchemy / Pydantic
│   │   └── core/             # config, logging, security
│   ├── migrations/
│   └── tests/
├── sandbox/                  # Docker image + runner scripts
├── scripts/                  # dev helpers, seed data
├── docs/                     # this documentation set
├── .env.example
├── docker-compose.yml        # optional local stack
└── README.md
```

---

## 3. Environment Variables

Create `.env` from the template below. **Never commit real secrets.**

```bash
# === Core ===
PARIKSHIT_ENV=development          # development | staging | production
PARIKSHIT_DATA_DIR=./data          # projects, workspaces, artifacts
PARIKSHIT_DB_URL=sqlite:///./data/parikshit.db

# === LLM Gateway ===
LLM_PROVIDER=openai                # openai | anthropic | azure | mock
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1   # optional for proxies
ANTHROPIC_API_KEY=                 # if using Anthropic
LLM_DEFAULT_MODEL=gpt-4o-mini
LLM_BUILDER_MODEL=gpt-4o
LLM_ADVERSARY_MODEL=gpt-4o
LLM_REVIEWER_MODEL=gpt-4o-mini
LLM_MAX_TOKENS_PER_SESSION=100000
LLM_DAILY_BUDGET_USD=20.00

# === Sandbox ===
SANDBOX_ENABLED=true
SANDBOX_IMAGE=parikshit-sandbox:latest
SANDBOX_MEMORY_LIMIT=512m
SANDBOX_CPU_LIMIT=1.0
SANDBOX_TIMEOUT_SEC=120
SANDBOX_NETWORK=none               # must remain none

# === Security / Limits ===
MAX_REPO_SIZE_MB=200
MAX_FILE_COUNT=3000
MAX_FILE_SIZE_MB=5
ALLOWED_GIT_HOSTS=github.com,gitlab.com,bitbucket.org

# === Frontend ===
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SSE_URL=http://localhost:8000/api/v1

# === Optional Auth (MVP can leave empty) ===
AUTH_DISABLED=true
# JWT_SECRET=... only if AUTH_DISABLED=false
```

---

## 4. Local Development Bootstrap

```bash
# 1. Clone & enter
git clone <repo> && cd parikshit

# 2. Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # or Windows equivalent
pip install -e ".[dev]"            # or uv/poetry
cp ../.env.example ../.env         # edit keys
alembic upgrade head               # or equivalent migration
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
pnpm install                       # or npm
pnpm dev                           # usually http://localhost:3000

# 4. Sandbox image (once)
cd sandbox
docker build -t parikshit-sandbox:latest .
```

---

## 5. Docker Compose (Optional One-Command Stack)

```yaml
# docker-compose.yml (simplified)
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./data:/data
      - /var/run/docker.sock:/var/run/docker.sock   # for nested Docker if needed
    env_file: .env
  web:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:8000/api/v1
```

**Note:** Nested Docker (API starting sandbox containers) requires careful volume and socket handling. For the purest demo, run API on the host and only sandbox containers via Docker.

---

## 6. Seed / Demo Data

- Provide a script `scripts/seed_demo_repo.sh` that clones a known-good public repository into `data/demo/`.
- Pre-index it so the first Mentor experience is instant for judges.
- Include a seeded failing test for the Self-Healing / Battle demo path.

---

## 7. Health Checks

- `GET /api/v1/health` → `{ "status": "ok", "db": "ok", "sandbox": "ok|disabled" }`
- Frontend should surface API reachability on the landing page.

---

## 8. Common Pitfalls

| Problem | Solution |
|---------|----------|
| Docker permission errors | Add user to `docker` group or use rootless |
| SQLite locked | Ensure WAL mode and single-writer discipline |
| LLM rate limits | Implement exponential backoff + budget circuit breaker |
| Large repo OOM | Enforce `MAX_REPO_SIZE_MB` and streaming indexing |
| Citation mismatch | Always run verifier before returning answers |

---

*All configuration is designed so that a fresh clone + `.env` + `docker build` is sufficient to reach a working Mentor on the demo repository.*
