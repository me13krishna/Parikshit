# Parikshit Demo Recording Playbook

This playbook outlines the exact 2-minute demonstration flow to record for product showcase and README demonstration GIFs.

## Prerequisites
1. Start Parikshit locally with `LLM_PROVIDER=mock`:
   ```bash
   make dev
   ```
2. Navigate browser to `http://localhost:3000`. Set browser viewport to `1280x800` (16:10 aspect ratio).

---

## Scene-by-Scene Script

### Scene 1: Repository Ingestion (0:00 - 0:25)
1. In the **Repository Ingest** tab, click **"Load Demo Project"**.
2. Notice the target fills with `./data/demo/calculator_app`.
3. Click **"Ingest & Initialize Revision"**.
4. Show the loading animation as AST parsing and symbol extraction run.
5. Watch the Cockpit automatically transition to the **Grounded Mentor** tab.

### Scene 2: Grounded Citations (0:25 - 0:50)
1. Click the quick prompt: *"Where is error handling or division by zero handled?"*
2. Point out the **"Grounded Answer"** badge in green.
3. Click the interactive citation pill `calculator.py:30`.
4. Demonstrate the **Citation Viewer modal** opening with the verified AST line range, exact snippet code, and SHA-256 hash. Close modal.

### Scene 3: Vibe Builder & Human Approval Gate (0:50 - 1:15)
1. Switch to the **Vibe Builder & Gate** tab.
2. Enter: *"Implement robust multiply operation and unit tests"*. Click **"Plan Task"**.
3. View the generated multi-step plan.
4. Click **"Build in Sandbox"**.
5. Inspect the generated **Unified Patch Diff** with color-coded syntax additions.
6. Attempt to click **"Apply & Export"** — notice the button is strictly disabled with a tooltip indicating human approval is required.
7. Click **"Approve Patch"**. Watch the gate turn green.
8. Click **"Apply & Export"** to confirm patch export.

### Scene 4: AI-vs-AI Battle Arena (1:15 - 1:40)
1. Switch to **AI vs AI Battle** tab.
2. Click **"Start Multi-Round Battle"**.
3. Watch Round 1 and Round 2 unfold:
   - Adversary QA attacks with edge cases (zero inputs, negative boundary values).
   - Sandbox runner executes tests and outputs results.
   - Reviewer synthesizes residual risks with severity ratings.

### Scene 5: Proof-of-Work Ledger Audit (1:40 - 2:00)
1. Switch to **Proof-of-Work Ledger** tab.
2. Show the real-time event chain: `project_ingested` -> `plan_created` -> `patch_applied` -> `battle_concluded`.
3. Click **"Verify Integrity"** to highlight the green **"Cryptographic Chain Verified: Intact"** badge.
4. Click **"Download Evidence Pack"** to show the complete tamper-evident JSON payload exported for compliance.
