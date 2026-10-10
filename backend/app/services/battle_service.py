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

class BattleService:
    @classmethod
    async def run_battle(
        cls,
        task_id: str,
        max_rounds: int = 2
    ) -> Dict[str, Any]:
        """
        Executes the AI vs AI Battle arena:
        Round 1..N:
          - Adversarial QA analyzes patch and writes challenge tests
          - Sandbox runs tests
          - Reviewer synthesizes findings & residual risks
        All rounds and final report are recorded in database and immutable ledger.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM tasks WHERE id = ?;", (task_id,))
            task = await cursor.fetchone()
            if not task:
                raise AppError(f"Task {task_id} not found", code="TASK_NOT_FOUND")

            project_id = task["project_id"]

            wsp_cursor = await db.execute(
                "SELECT * FROM workspaces WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;",
                (task_id,)
            )
            wsp = await wsp_cursor.fetchone()
            if not wsp:
                raise AppError("No workspace found for this task", code="WORKSPACE_NOT_FOUND")

            patch_cursor = await db.execute(
                "SELECT * FROM patches WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1;",
                (wsp["id"],)
            )
            patch = await patch_cursor.fetchone()
            if not patch:
                raise AppError("No patch found to battle against", code="PATCH_NOT_FOUND")

        workspace_id = wsp["id"]
        workspace_dir = Path(wsp["storage_path"])
        patch_id = patch["id"]
        unified_diff = patch["unified_diff"]

        battle_id = f"bat_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                "INSERT INTO battles (id, task_id, status, created_at) VALUES (?, ?, 'running', ?);",
                (battle_id, task_id, now_iso)
            )
            await db.commit()

        rounds_summary = []
        all_challenges = []
        all_residual_risks = []

        logger.info(f"Starting AI vs AI Battle {battle_id} on task {task_id} (max_rounds={max_rounds})...")

        for round_num in range(1, max_rounds + 1):
            round_id = f"rnd_{uuid.uuid4().hex[:12]}"
            round_now = datetime.now(timezone.utc).isoformat()

            # 1. Adversarial QA: Generate Challenge & Tests
            adversary_prompt = f"""
You are the ADVERSARIAL QA ENGINEER. Your mission is to rigorously CHALLENGE the Builder's work.
You MUST NOT simply agree. Identify edge cases, boundary conditions (zero, negative, float precision, empty lists, extreme inputs).

Builder's Patch Diff:
```diff
{unified_diff}
```

Task Description: "{task['request_text']}"

Produce JSON:
{{
  "challenge_title": "Concrete challenge title",
  "challenge_description": "Explanation of edge case or risk",
  "severity": "high|medium|low",
  "test_code": "def test_adversarial_challenge(): ... complete pytest function"
}}
"""
            messages = [
                {"role": "system", "content": "You are the Parikshit Adversarial QA Engineer. Find vulnerabilities and edge cases."},
                {"role": "user", "content": adversary_prompt}
            ]

            llm_res = await LLMGateway.generate_chat(messages, temperature=0.3)
            raw = llm_res["content"].strip()

            try:
                clean = raw
                if "```json" in clean:
                    clean = clean.split("```json")[1].split("```")[0].strip()
                elif "```" in clean:
                    clean = clean.split("```")[1].split("```")[0].strip()
                adv_data = json.loads(clean)
            except Exception:
                # Deterministic adversarial challenge fallback
                adv_data = {
                    "challenge_title": f"Boundary condition check round {round_num}",
                    "challenge_description": "Validates boundary precision and unexpected zero/negative operations.",
                    "severity": "medium",
                    "test_code": f"""
def test_adversarial_edge_case_r{round_num}():
    c = Calculator()
    # Test extreme values and history tracking
    res = c.add(1e6, -1e6)
    assert res == 0
"""
                }

            all_challenges.append(adv_data)

            # Write adversary test to workspace
            adv_test_file = workspace_dir / f"test_adversary_r{round_num}.py"
            adv_test_content = f"import pytest\nfrom calculator import Calculator\n\n{adv_data.get('test_code', '')}\n"
            adv_test_file.write_text(adv_test_content, encoding="utf-8")

            # 2. Execute Sandbox checks
            sandbox_run = await SandboxService.run_command(workspace_id, command=f"pytest -v test_adversary_r{round_num}.py")

            # 3. Reviewer Synthesis
            reviewer_prompt = f"""
You are the REVIEWER AGENT. Synthesize findings from this battle round.
Adversary Challenge: {adv_data['challenge_title']} - {adv_data['challenge_description']}
Sandbox Exit Code: {sandbox_run['exit_code']}
Test Output: {sandbox_run['stdout']}

Produce JSON:
{{
  "summary": "Concise technical evaluation of the round",
  "residual_risks": ["Risk 1", "Risk 2"],
  "verdict": "approved_with_risks|needs_rework|passed_cleanly"
}}
"""
            rev_messages = [
                {"role": "system", "content": "You are the Parikshit Reviewer Agent. Impartial, evidence-based synthesizer."},
                {"role": "user", "content": reviewer_prompt}
            ]

            rev_res = await LLMGateway.generate_chat(rev_messages, temperature=0.1)
            try:
                rclean = rev_res["content"].strip()
                if "```json" in rclean:
                    rclean = rclean.split("```json")[1].split("```")[0].strip()
                elif "```" in rclean:
                    rclean = rclean.split("```")[1].split("```")[0].strip()
                rev_data = json.loads(rclean)
            except Exception:
                rev_data = {
                    "summary": f"Round {round_num}: Adversarial challenge executed in sandbox with status {sandbox_run['status']}.",
                    "residual_risks": ["Potential precision loss on floating point edge cases."],
                    "verdict": "passed_cleanly" if sandbox_run["exit_code"] == 0 else "needs_rework"
                }

            all_residual_risks.extend(rev_data.get("residual_risks", []))

            # Record round in DB
            async with aiosqlite.connect(db_path) as db:
                await db.execute(
                    """
                    INSERT INTO battle_rounds (
                        id, battle_id, round_number, builder_patch_id, adversary_challenge, test_run_id, reviewer_summary, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        round_id,
                        battle_id,
                        round_num,
                        patch_id,
                        json.dumps(adv_data),
                        sandbox_run["run_id"],
                        rev_data.get("summary", ""),
                        round_now
                    )
                )

                finding_id = f"fnd_{uuid.uuid4().hex[:12]}"
                await db.execute(
                    """
                    INSERT INTO agent_findings (
                        id, battle_round_id, agent_role, severity, title, description, suggested_test, related_locations, created_at
                    ) VALUES (?, ?, 'adversary', ?, ?, ?, ?, '[]', ?);
                    """,
                    (
                        finding_id,
                        round_id,
                        adv_data.get("severity", "medium"),
                        adv_data.get("challenge_title", ""),
                        adv_data.get("challenge_description", ""),
                        adv_data.get("test_code", ""),
                        round_now
                    )
                )
                await db.commit()

            rounds_summary.append({
                "round_number": round_num,
                "adversary_challenge": adv_data,
                "test_run": sandbox_run,
                "reviewer": rev_data
            })

            # Append round to Ledger
            await LedgerService.append_entry(
                event_type="battle_round_completed",
                project_id=project_id,
                payload={
                    "battle_id": battle_id,
                    "round_number": round_num,
                    "challenge": adv_data["challenge_title"],
                    "test_status": sandbox_run["status"],
                    "verdict": rev_data.get("verdict")
                },
                related_ids={"battle_id": battle_id, "task_id": task_id, "run_id": sandbox_run["run_id"]}
            )

        # Final Battle Report
        final_verdict = "approved_with_risks" if all_residual_risks else "passed_cleanly"
        async with aiosqlite.connect(db_path) as db:
            await db.execute("UPDATE battles SET status = 'complete' WHERE id = ?;", (battle_id,))
            await db.commit()

        battle_report = {
            "battle_id": battle_id,
            "task_id": task_id,
            "total_rounds": len(rounds_summary),
            "rounds": rounds_summary,
            "challenges_raised": all_challenges,
            "residual_risks": list(set(all_residual_risks)),
            "final_verdict": final_verdict
        }

        # Final battle ledger entry
        await LedgerService.append_entry(
            event_type="battle_concluded",
            project_id=project_id,
            payload={
                "battle_id": battle_id,
                "final_verdict": final_verdict,
                "residual_risks_count": len(battle_report["residual_risks"])
            },
            related_ids={"battle_id": battle_id, "task_id": task_id}
        )

        return battle_report
