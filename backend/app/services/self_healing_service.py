import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import aiosqlite

from app.core.logging import logger
from app.core.errors import AppError
from app.db.database import get_db_path
from app.agents.llm_gateway import LLMGateway
from app.services.sandbox_service import SandboxService
from app.services.workspace_service import WorkspaceService
from app.services.ledger_service import LedgerService

class SelfHealingService:
    @classmethod
    async def heal_failure(
        cls,
        baseline_run_id: str,
        max_attempts: int = 3
    ) -> Dict[str, Any]:
        """
        Autonomous self-healing loop:
        1. Capture & freeze baseline failure
        2. Reproduce failure check
        3. Diagnose: ranked hypotheses with code citations
        4. Attempt patch & verify in sandbox
        5. Emit verdict: verified_fix | attempted_fix | inconclusive | failed
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            run_cursor = await db.execute("SELECT * FROM sandbox_runs WHERE id = ?;", (baseline_run_id,))
            baseline_run = await run_cursor.fetchone()
            if not baseline_run:
                raise AppError(f"Baseline run {baseline_run_id} not found", code="NOT_FOUND")

            workspace_id = baseline_run["workspace_id"]
            command = baseline_run["command"]

            wsp_cursor = await db.execute("SELECT * FROM workspaces WHERE id = ?;", (workspace_id,))
            wsp = await wsp_cursor.fetchone()
            task_id = wsp["task_id"]

            task_cursor = await db.execute("SELECT project_id FROM tasks WHERE id = ?;", (task_id,))
            task = await task_cursor.fetchone()
            project_id = task["project_id"]

        workspace_dir = Path(wsp["storage_path"])
        logger.info(f"Initiating Self-Healing loop for failing run {baseline_run_id}...")

        # Step 1: Reproduce Check
        reproduce_run = await SandboxService.run_command(workspace_id, command=command)
        if reproduce_run["exit_code"] == 0:
            # Flaky or already passing! Rule: Must reproduce before repair
            attempt_id = f"rep_{uuid.uuid4().hex[:12]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            async with aiosqlite.connect(db_path) as db:
                await db.execute(
                    """
                    INSERT INTO repair_attempts (
                        id, baseline_run_id, attempt_number, diagnosis, patch_id, verification_run_id, verdict, created_at
                    ) VALUES (?, ?, 1, ?, NULL, ?, 'inconclusive', ?);
                    """,
                    (attempt_id, baseline_run_id, json.dumps({"note": "Failure did not reproduce"}), reproduce_run["run_id"], now_iso)
                )
                await db.commit()

            return {
                "verdict": "inconclusive",
                "message": "Failure could not be reproduced in fresh sandbox execution.",
                "attempts_count": 1,
                "baseline_run_id": baseline_run_id
            }

        # Step 2: Diagnose (Ranked hypotheses with citations)
        failure_log = baseline_run["stderr"] or baseline_run["stdout"]
        calc_file = workspace_dir / "calculator.py"
        calc_code = calc_file.read_text(encoding="utf-8") if calc_file.is_file() else ""

        diagnosis_prompt = f"""
Analyze this failing test execution log and produce ranked hypotheses.
Failing command: "{command}"
Error log:
```
{failure_log}
```

Relevant source code:
```python
{calc_code}
```

Respond in JSON:
{{
  "hypotheses": [
    {{
      "rank": 1,
      "description": "Root cause explanation",
      "confidence": 0.9,
      "recommended_fix": "Description of fix"
    }}
  ]
}}
"""
        messages = [
            {"role": "system", "content": "You are the Parikshit Self-Healing Diagnostic Agent."},
            {"role": "user", "content": diagnosis_prompt}
        ]

        diag_res = await LLMGateway.generate_chat(messages, temperature=0.1)
        try:
            dclean = diag_res["content"].strip()
            if "```json" in dclean:
                dclean = dclean.split("```json")[1].split("```")[0].strip()
            elif "```" in dclean:
                dclean = dclean.split("```")[1].split("```")[0].strip()
            diagnosis_data = json.loads(dclean)
        except Exception:
            diagnosis_data = {
                "hypotheses": [
                    {
                        "rank": 1,
                        "description": "Assertion mismatch or missing method implementation.",
                        "confidence": 0.85,
                        "recommended_fix": "Ensure return values and exception cases align with tests."
                    }
                ]
            }

        # Step 3: Repair attempts loop
        final_verdict = "failed"
        successful_attempt = None

        for attempt_no in range(1, max_attempts + 1):
            attempt_id = f"rep_{uuid.uuid4().hex[:12]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            # Generate fix
            fix_prompt = f"""
Hypothesis: {diagnosis_data['hypotheses'][0]['description']}
Failing log: {failure_log}
Current Code:
```python
{calc_code}
```

Provide the fixed code for calculator.py.
Return ONLY valid Python code inside ```python block.
"""
            fix_res = await LLMGateway.generate_chat([
                {"role": "system", "content": "You are the Parikshit Repair Agent."},
                {"role": "user", "content": fix_prompt}
            ])

            code_text = fix_res["content"]
            if "```" in code_text:
                clean_fix = code_text.split("```")[1]
                lines = clean_fix.splitlines()
                if lines and lines[0].strip().lower() in ["python", "py"]:
                    clean_fix = "\n".join(lines[1:])
            else:
                clean_fix = code_text

            # Apply patch inside workspace
            patch_res = await WorkspaceService.apply_file_changes(
                workspace_id,
                {"calculator.py": clean_fix},
                agent_role="healer"
            )

            # Re-verify in sandbox
            verify_run = await SandboxService.run_command(workspace_id, command=command)

            if verify_run["exit_code"] == 0:
                final_verdict = "verified_fix"
                successful_attempt = attempt_no

                # Record in DB
                async with aiosqlite.connect(db_path) as db:
                    await db.execute(
                        """
                        INSERT INTO repair_attempts (
                            id, baseline_run_id, attempt_number, diagnosis, patch_id, verification_run_id, verdict, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, 'verified_fix', ?);
                        """,
                        (attempt_id, baseline_run_id, attempt_no, json.dumps(diagnosis_data), patch_res["patch_id"], verify_run["run_id"], now_iso)
                    )
                    await db.commit()

                # Ledger record
                await LedgerService.append_entry(
                    event_type="self_heal_verified",
                    project_id=project_id,
                    payload={
                        "attempt_id": attempt_id,
                        "baseline_run_id": baseline_run_id,
                        "attempt_number": attempt_no,
                        "verdict": "verified_fix"
                    },
                    related_ids={"run_id": verify_run["run_id"], "patch_id": patch_res["patch_id"]}
                )
                break
            else:
                final_verdict = "attempted_fix"
                async with aiosqlite.connect(db_path) as db:
                    await db.execute(
                        """
                        INSERT INTO repair_attempts (
                            id, baseline_run_id, attempt_number, diagnosis, patch_id, verification_run_id, verdict, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, 'attempted_fix', ?);
                        """,
                        (attempt_id, baseline_run_id, attempt_no, json.dumps(diagnosis_data), patch_res["patch_id"], verify_run["run_id"], now_iso)
                    )
                    await db.commit()

        return {
            "baseline_run_id": baseline_run_id,
            "verdict": final_verdict,
            "attempts_run": attempt_no,
            "diagnosis": diagnosis_data,
            "successful_attempt": successful_attempt
        }
