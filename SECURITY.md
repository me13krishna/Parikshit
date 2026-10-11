# Security Policy

## Reporting Security Issues

We take the security of Parikshit very seriously. If you discover a vulnerability or security flaw, please do **NOT** open a public issue. Instead, report it responsibly:

- **Email**: `security@parikshit.ai` (or directly contact project maintainers)
- **Response SLA**: Initial triage within 24 hours; patch or mitigation roadmap within 72 hours.
- Please include reproduction steps, environment details, and proof of concept.

---

## Threat Model & Core Assumptions

Parikshit acts as an autonomous AI engineering teammate capable of executing code, proposing patches, and interacting with code repositories. Because AI agents process untrusted inputs (repository code, external dependency artifacts, user instructions), our threat model explicitly defends against:

1. **Untrusted Code Execution**:
   - AI-generated code or repository tests could attempt arbitrary system commands, socket connections, network scanning, or host filesystem tampering.
   - **Mitigation**: Strict containerization via isolated Docker sandboxes (`--network none`, `--cap-drop ALL`, `--security-opt no-new-privileges`, `--read-only` root filesystem, unprivileged UID `1000:1000`, `--memory` and `--cpus` limits). Host execution is strictly forbidden in production and permitted only in local development when explicitly configured.

2. **Command & Parameter Injection**:
   - Dynamic parameters to test runners or shell utilities could allow escape.
   - **Mitigation**: Command allowlisting via fixed profiles (`pytest`, `pytest_coverage`, `test_quick`). Arbitrary shell strings and `shell=True` are disallowed.

3. **Repository Ingestion Attacks**:
   - Malicious git URLs could trigger protocol hijacking or argument injection.
   - Malicious ZIP files (zip bombs, directory traversal with `../` or absolute paths) could overwrite system files.
   - **Mitigation**: Git URLs require `https://` with strict host allowlisting (`ALLOWED_GIT_HOSTS`). Git clone arguments are passed after `--` with terminal prompts disabled. ZIP archives are scanned member-by-member with path boundary validation and total uncompressed byte limits.

4. **Workspace Escaping & Path Traversal**:
   - AI file patches could attempt to write files outside the workspace directory (`../../etc/passwd`).
   - **Mitigation**: All path modifications are verified to remain strictly within the workspace directory using relative path assertions. Violations raise `PATH_ESCAPES_WORKSPACE` (400 AppError).

5. **Ledger Tampering & History Manipulation**:
   - Attackers or compromised tasks could attempt to modify past audit trails or delete evidence.
   - **Mitigation**: Database-level immutability triggers prevent `UPDATE` and `DELETE` on the `ledger_entries` table. Every entry is chained using SHA-256 hashes (`parent_hash` + canonical payload), creating an auditable proof-of-work chain.

6. **Prompt Injection & Model Abuse**:
   - Repository code or comments containing prompt injection payloads attempting to redirect agent instructions.
   - **Mitigation**: Repository code is treated as data, delimited and escaped. Multi-agent adversarial validation challenges proposed changes before applying them.

---

## Sandbox Guarantees and Limits

| Guarantee | Status | Enforcement Mechanism |
|-----------|--------|----------------------|
| Network Isolation | Guaranteed in Docker | `--network none` flag passed to Docker daemon |
| Filesystem Protection | Read-only container root | `--read-only` root with restricted `/tmp` tmpfs |
| Privilege Escalation | Blocked | `--cap-drop ALL`, `--security-opt no-new-privileges` |
| PID Flooding | Limited | `--pids-limit 100` |
| Resource Exhaustion | Enforced | `--memory 512m` and `--cpus 1.0` limits |
| Host Fallback | Disabled in Prod | Fails closed; host fallback requires `PARIKSHIT_ENV=development` and logs warning |

### Known Limits
- In local development mode (`SANDBOX_ENABLED=false`), test execution runs directly on the developer's workstation using Python subprocesses. Do not disable sandboxing when analyzing untrusted third-party code in shared environments.
- SQLite-backed ledgers guarantee immutability against normal application operations and SQL queries via triggers. However, an attacker with full raw root access to the physical filesystem could replace the SQLite database file; for maximum assurance in enterprise deployments, the latest head hash should be periodically committed to an external notary or immutable cloud store.
