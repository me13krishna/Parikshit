# Parikshit – Final Developer-Ready Documentation Set

**Project:** Parikshit (Team Vishwam)  
**Synthesized:** 10 October 2026  
**Status:** Ready for hand-off to Antigravity / engineering team  

This folder contains the reconciled, cleaned, and developer-ready documentation produced from the original Claude and Grok source document sets.

---

## Document Index

| # | File | Purpose |
|---|------|---------|
| 1 | [01_PRD.md](01_PRD.md) | Product Requirements Document – vision, personas, features, scope, success metrics |
| 2 | [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md) | System architecture, tech stack, component breakdown, data flows |
| 3 | [03_IMPLEMENTATION_PLAN.md](03_IMPLEMENTATION_PLAN.md) | Sprint-by-sprint task breakdown with dependencies and priorities |
| 4 | [04_DATA_DICTIONARY_AND_SCHEMA.md](04_DATA_DICTIONARY_AND_SCHEMA.md) | Complete data model, table definitions, integrity rules |
| 5 | [05_ENVIRONMENT_SETUP.md](05_ENVIRONMENT_SETUP.md) | Local setup, `.env` template, bootstrap commands |
| 6 | [06_SECURITY_ERROR_LOGGING.md](06_SECURITY_ERROR_LOGGING.md) | Security model, sandbox spec, error handling, logging strategy |
| 7 | [07_API_CONTRACTS_SUMMARY.md](07_API_CONTRACTS_SUMMARY.md) | REST + SSE API contract summary |
| 8 | [08_AGENT_PROMPTS_SUMMARY.md](08_AGENT_PROMPTS_SUMMARY.md) | Agent roles, safety core, output schemas, tool allow-lists |

---

## How to Use This Set with Antigravity

1. Start with **01_PRD.md** for product intent and priority ordering.
2. Read **02_SYSTEM_ARCHITECTURE.md** + **04_DATA_DICTIONARY_AND_SCHEMA.md** for the technical shape.
3. Follow **03_IMPLEMENTATION_PLAN.md** sprint by sprint. Respect the cut rule.
4. Use **05_ENVIRONMENT_SETUP.md** to bootstrap the monorepo.
5. Enforce **06_SECURITY_ERROR_LOGGING.md** from day one (especially sandbox network isolation and citation verification).
6. Implement against **07_API_CONTRACTS_SUMMARY.md**; generate full OpenAPI from code.
7. Keep agent behaviour aligned with **08_AGENT_PROMPTS_SUMMARY.md**.

---

## Key Decisions Made During Reconciliation

| Topic | Decision | Rationale / Flag |
|-------|----------|------------------|
| Primary source of truth | Claude document set (more detailed, consistent 2026 dating) | Grok set used for complementary clarity |
| Database | SQLite (WAL + FTS5) for MVP | Zero-ops; schema designed for later Postgres migration |
| Auth | Disabled / single-user for MVP | Faster demo; easy to add later |
| Languages | Python + JS/TS first | Matches team skills and demo needs |
| Retrieval | Keyword + symbol (tree-sitter) first | Deterministic; embeddings only if needed |
| Sandbox | Docker with `--network=none` mandatory | Non-negotiable safety boundary |
| Citation integrity | Server-side verification before any display | Core differentiator |
| Phase cut rule | Mentor + Ledger on demo repo must work before P2/P3 features | Explicit in PRD |

**Open items still requiring team confirmation** are listed in section 6 of the PRD.

---

## Original Source Material

All original PDFs remain in `../AI docs/Claude/` and `../AI docs/Grok/`. This final set supersedes them for implementation purposes.

---

**Ready for Antigravity.** Begin with Sprint 0 of the Implementation Plan.
