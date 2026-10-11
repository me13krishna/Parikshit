# Contributing to Parikshit

Thank you for your interest in contributing to **Parikshit: The Grounded AI Engineering Teammate**.

## Guiding Principles

1. **Verify, Never Assume:** Parikshit's core promise is verifiable AI engineering. All new agent outputs must be backed by AST citations, immutable ledger hashes, and sandbox checks.
2. **Deterministic & Safe Execution:** Untrusted code execution must remain isolated. Never bypass the sandbox or host execution guards.
3. **No Fake Success:** If an LLM call or test fails, surface clear error codes rather than masking failures.

## Development Workflow

### Prerequisites
- Python 3.11 or 3.12
- Node.js 20+ and npm 10+
- Docker (for isolated sandbox verification)

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/team-vishwam/parikshit.git
cd parikshit

# 2. Setup backend
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

# 3. Setup frontend
cd ../frontend
npm install

# 4. Run tests
make test
```

## Commit Guidelines

We enforce the **Conventional Commits** specification:
- `feat:` A new user-facing feature or agent capability
- `fix:` A bug fix or security patch
- `test:` Adding or refactoring tests
- `docs:` Documentation updates
- `chore:` Dependency bumps, tooling, or build configuration

## Pull Request Checklist

- [ ] All tests pass: `make test`
- [ ] Code is formatted and linted: `make lint`
- [ ] Coverage does not drop below 70%: `pytest --cov=app`
- [ ] Changes adhere to API contracts in `docs/07_API_CONTRACTS_SUMMARY.md`
