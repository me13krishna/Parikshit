# GitHub Repository Configuration

Use these details to configure the GitHub repository settings.

## Repository Description
> Grounded AI Engineering Teammate: Understand, change, challenge, verify, and prove code modifications with AST citations, isolated sandbox execution, AI-vs-AI adversarial battles, and tamper-evident hash ledgers.

## Website
> https://parikshit.dev (or link to repository deployment)

## Topics / Tags
```
fastapi
nextjs
ai-agents
multi-agent
llm
code-review
sqlite
docker
sandbox
developer-tools
ast
security
```

## Recommended Repository Settings
- **Merge Button:** Squash and merge or Rebase and merge (enforces clean Conventional Commit history).
- **Branch Protection (`main`):**
  - Require status checks to pass before merging:
    - `Backend Test (Python 3.11)`
    - `Backend Test (Python 3.12)`
    - `Frontend Lint & Test`
    - `Docker Image Build Validation`
  - Require branches to be up to date before merging.
- **Vulnerability Alerts:** Dependabot alerts and security updates enabled.
