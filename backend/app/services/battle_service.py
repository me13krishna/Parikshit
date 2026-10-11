import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import aiosqlite

from app.core.logging import logger
from app.core.config import settings
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

        files_changed = json.loads(patch["files_changed"]) if ("files_changed" in patch.keys() and patch["files_changed"]) else []
        import_lines = ["import pytest"]
        for f in files_changed:
            stem = Path(f).stem
            if not stem.startswith("test_") and stem != "__init__":
                import_lines.append(f"import {stem}")
        if len(import_lines) == 1 and (workspace_dir / "calculator.py").exists():
            import_lines.append("from calculator import Calculator")
        module_import_header = "\n".join(import_lines) + "\n\n"

        for round_num in range(1, max_rounds + 1):
            round_id = f"rnd_{uuid.uuid4().hex[:12]}"
            round_now = datetime.now(timezone.utc).isoformat()

            # 1. Adversarial QA: Generate Challenge & Tests
            history_context = ""
            if all_challenges:
                history_context = "\nPreviously run challenges (DO NOT duplicate):\n" + "\n".join(
                    f"- Round {c.get('round', i+1)}: {c.get('challenge_title')}" for i, c in enumerate(all_challenges)
                )

            adversary_prompt = f"""
You are the ADVERSARIAL QA ENGINEER. Your mission is to rigorously CHALLENGE the Builder's work.
You MUST NOT simply agree. Identify edge cases, boundary conditions (zero, negative, float precision, empty lists, extreme inputs).
{history_context}

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
                {"role": "system", "content": LLMGateway.get_system_prompt("adversary")},
                {"role": "user", "content": adversary_prompt}
            ]

            llm_res = await LLMGateway.generate_chat(messages, role="adversary", temperature=0.3)
            raw = llm_res["content"].strip()

            try:
                clean = raw
                if "```json" in clean:
                    clean = clean.split("```json")[1].split("```")[0].strip()
                elif "```" in clean:
                    clean = clean.split("```")[1].split("```")[0].strip()
                adv_data = json.loads(clean)
            except Exception:
                if settings.LLM_PROVIDER != "mock":
                    raise AppError(f"Adversary agent output failed to parse: {raw}", code="ADVERSARY_PARSE_ERROR")
                if (workspace_dir / "calculator.py").exists():
                    r_tests = {
                        1: ("Boundary Zero & Negative Addition", "c = Calculator()\n    assert c.add(-100, 100) == 0", "low"),
                        2: ("Division by Zero Exception", "c = Calculator()\n    with pytest.raises(ValueError):\n        c.divide(10, 0)", "high"),
                        3: ("Precision and Multiplication Stress", "c = Calculator()\n    assert c.multiply(0.5, 2.0) == 1.0", "medium")
                    }
                    title, code, sev = r_tests.get(round_num, ("General Boundary Test", "assert True", "low"))
                    adv_data = {
                        "challenge_title": f"Round {round_num}: {title}",
                        "challenge_description": f"Validates {title.lower()} behavior.",
                        "severity": sev,
                        "test_code": f"def test_adversarial_challenge_r{round_num}():\n    {code}\n"
                    }
                else:
                    adv_data = {
                        "challenge_title": f"Round {round_num}: Boundary & Invariant Check",
                        "challenge_description": "Validates boundary precision and unexpected zero/negative operations.",
                        "severity": "medium",
                        "test_code": f"def test_adversarial_challenge_r{round_num}():\n    assert True\n"
                    }

            adv_data["round"] = round_num
            adv_data["challenge_title"] = adv_data.get("challenge_title") or adv_data.get("title") or f"Round {round_num}: Adversarial Challenge"
            adv_data["challenge_description"] = adv_data.get("challenge_description") or adv_data.get("description") or "Validates boundary precision and edge cases."
            adv_data["title"] = adv_data["challenge_title"]
            adv_data["description"] = adv_data["challenge_description"]
            all_challenges.append(adv_data)

            # Write adversary test to workspace
            adv_test_file = workspace_dir / f"test_adversary_r{round_num}.py"
            test_body = adv_data.get('test_code', '')
            if "import " not in test_body:
                adv_test_content = f"{module_import_header}{test_body}\n"
            else:
                adv_test_content = f"import pytest\n{test_body}\n"
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
                {"role": "system", "content": LLMGateway.get_system_prompt("reviewer")},
                {"role": "user", "content": reviewer_prompt}
            ]

            rev_res = await LLMGateway.generate_chat(rev_messages, role="reviewer", temperature=0.1)
            try:
                rclean = rev_res["content"].strip()
                if "```json" in rclean:
                    rclean = rclean.split("```json")[1].split("```")[0].strip()
                elif "```" in rclean:
                    rclean = rclean.split("```")[1].split("```")[0].strip()
                rev_data = json.loads(rclean)
            except Exception:
                if settings.LLM_PROVIDER != "mock":
                    raise AppError(f"Reviewer output failed to parse: {rev_res['content']}", code="REVIEWER_PARSE_ERROR")
                rev_data = {
                    "summary": f"Round {round_num}: Adversarial challenge executed with status {sandbox_run['status']}.",
                    "residual_risks": ["Potential edge boundary risk if invalid types passed."],
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
            "final_verdict": final_verdict,
            "mode": "mock" if settings.LLM_PROVIDER == "mock" else "live"
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
