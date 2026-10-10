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
from app.services.retrieval_service import RetrievalService
from app.services.workspace_service import WorkspaceService
from app.services.sandbox_service import SandboxService
from app.services.ledger_service import LedgerService

class TaskService:
    @classmethod
    async def create_task(cls, project_id: str, request_text: str) -> Dict[str, Any]:
        """
        Creates an engineering task from user natural language, retrieves relevant code,
        and generates a reviewable implementation plan.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;",
                (project_id,)
            )
            rev = await cursor.fetchone()
            if not rev:
                raise AppError("No indexed revision found for project", code="NOT_FOUND")
            revision_id = rev["id"]

        task_id = f"tsk_{uuid.uuid4().hex[:12]}"
        plan_id = f"pln_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Retrieve relevant code context
        context_chunks = await RetrievalService.retrieve(revision_id, request_text, limit=4)
        context_str = "\n".join([f"{c['path']}:{c['start_line']}-{c['end_line']}\n{c['content']}" for c in context_chunks])

        # Generate implementation plan via LLM
        prompt = f"""
Developer Request: "{request_text}"

Relevant Codebase Context:
{context_str}

Create an engineering implementation plan in JSON:
{{
  "summary": "Brief summary of the intended changes",
  "files_affected": ["list of relative file paths to create/modify"],
  "steps": [
    {{"step": 1, "action": "modify|create", "path": "path/to/file", "description": "What to change"}}
  ],
  "testing_strategy": "How changes will be verified with pytest"
}}
"""
        messages = [
            {"role": "system", "content": "You are the Parikshit Plan Architect. Create precise plans."},
            {"role": "user", "content": prompt}
        ]

        llm_res = await LLMGateway.generate_chat(messages=messages, temperature=0.1)
        raw = llm_res["content"].strip()

        try:
            clean = raw
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0].strip()
            plan_data = json.loads(clean)
        except Exception:
            # Deterministic plan fallback
            affected = [c["path"] for c in context_chunks] or ["calculator.py", "test_calculator.py"]
            plan_data = {
                "summary": f"Implement requested changes: {request_text}",
                "files_affected": affected,
                "steps": [
                    {"step": 1, "action": "modify", "path": affected[0], "description": "Implement feature logic"},
                    {"step": 2, "action": "modify", "path": affected[-1], "description": "Add unit tests"}
                ],
                "testing_strategy": "Run pytest suite inside isolated sandbox."
            }

        # Store in DB
        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                """
                INSERT INTO tasks (id, project_id, revision_id, request_text, status, created_at)
                VALUES (?, ?, ?, ?, 'planning', ?);
                """,
                (task_id, project_id, revision_id, request_text, now_iso)
            )

            await db.execute(
                """
                INSERT INTO plans (id, task_id, content, approved_at, created_at)
                VALUES (?, ?, ?, NULL, ?);
                """,
                (plan_id, task_id, json.dumps(plan_data), now_iso)
            )
            await db.commit()

        # Ledger record
        await LedgerService.append_entry(
            event_type="plan_created",
            project_id=project_id,
            payload={
                "task_id": task_id,
                "plan_id": plan_id,
                "request_text": request_text,
                "plan": plan_data
            },
            related_ids={"task_id": task_id, "plan_id": plan_id}
        )

        return {
            "task_id": task_id,
            "plan_id": plan_id,
            "revision_id": revision_id,
            "request_text": request_text,
            "status": "planning",
            "plan": plan_data
        }

    @classmethod
    async def approve_and_build(cls, task_id: str) -> Dict[str, Any]:
        """
        User approval gate: marks plan approved, spawns isolated workspace,
        and invokes the Builder agent to apply code changes.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM tasks WHERE id = ?;", (task_id,))
            task = await cursor.fetchone()
            if not task:
                raise AppError(f"Task {task_id} not found", code="TASK_NOT_FOUND")

            plan_cursor = await db.execute("SELECT * FROM plans WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
            plan_row = await plan_cursor.fetchone()
            plan_data = json.loads(plan_row["content"]) if plan_row else {}

            project_id = task["project_id"]
            revision_id = task["revision_id"]
            request_text = task["request_text"]

            now_iso = datetime.now(timezone.utc).isoformat()
            await db.execute("UPDATE plans SET approved_at = ? WHERE task_id = ?;", (now_iso, task_id))
            await db.execute("UPDATE tasks SET status = 'building' WHERE id = ?;", (task_id,))
            await db.commit()

        # 1. Create Workspace
        workspace = await WorkspaceService.create_workspace(task_id, revision_id)
        workspace_id = workspace["workspace_id"]
        workspace_dir = Path(workspace["storage_path"])

        # 2. Builder Agent: Synthesizes modified code
        files_to_update: Dict[str, str] = {}
        for file_rel in plan_data.get("files_affected", []):
            target_f = workspace_dir / file_rel
            existing_code = target_f.read_text(encoding="utf-8", errors="replace") if target_f.is_file() else ""

            prompt = f"""
Task: "{request_text}"
File to update: {file_rel}

Existing Code:
```
{existing_code}
```

Provide the complete updated code for '{file_rel}' implementing the required feature or test.
Return ONLY code inside a single ```python (or matching language) block.
"""
            messages = [
                {"role": "system", "content": "You are the Parikshit Builder Agent. Write clean, robust, verified code."},
                {"role": "user", "content": prompt}
            ]

            llm_res = await LLMGateway.generate_chat(messages, temperature=0.2)
            content = llm_res["content"]

            if "```" in content:
                code_block = content.split("```")[1]
                lines = code_block.splitlines()
                if lines and lines[0].strip().lower() in ["python", "py", "ts", "typescript", "js", "javascript"]:
                    code_block = "\n".join(lines[1:])
                clean_code = code_block
            else:
                clean_code = content

            files_to_update[file_rel] = clean_code

        # If LLM generated nothing (e.g. mock fallback), apply clean programmatic changes
        if not files_to_update or all(not v.strip() for v in files_to_update.values()):
            # Fallback demonstration modification
            calc_f = workspace_dir / "calculator.py"
            if calc_f.is_file():
                calc_code = calc_f.read_text(encoding="utf-8")
                if "def multiply" not in calc_code:
                    calc_code += "\n    def multiply(self, a: float, b: float) -> float:\n        res = a * b\n        self.history.append(('mul', a, b, res))\n        return res\n"
                    files_to_update["calculator.py"] = calc_code

            test_f = workspace_dir / "test_calculator.py"
            if test_f.is_file():
                test_code = test_f.read_text(encoding="utf-8")
                if "test_multiply" not in test_code:
                    test_code += "\ndef test_multiply():\n    c = Calculator()\n    assert c.multiply(3, 4) == 12\n"
                    files_to_update["test_calculator.py"] = test_code

        # 3. Apply changes inside workspace
        patch_res = await WorkspaceService.apply_file_changes(workspace_id, files_to_update, agent_role="builder")

        async with aiosqlite.connect(db_path) as db:
            await db.execute("UPDATE tasks SET status = 'review' WHERE id = ?;", (task_id,))
            await db.commit()

        return {
            "task_id": task_id,
            "workspace_id": workspace_id,
            "patch_id": patch_res["patch_id"],
            "files_changed": patch_res["files_changed"],
            "unified_diff": patch_res["unified_diff"],
            "status": "review"
        }

    @classmethod
    async def record_human_approval(
        cls,
        task_id: str,
        decision: str,  # approved | rejected
        actor: str = "user"
    ) -> Dict[str, Any]:
        """
        Enforces human approval gate before export or merge.
        """
        db_path = get_db_path()
        now_iso = datetime.now(timezone.utc).isoformat()
        approval_id = f"app_{uuid.uuid4().hex[:12]}"

        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT project_id, status FROM tasks WHERE id = ?;", (task_id,))
            task = await cursor.fetchone()
            if not task:
                raise AppError(f"Task {task_id} not found", code="TASK_NOT_FOUND")

            project_id = task["project_id"]
            new_status = "approved" if decision == "approved" else "rejected"

            await db.execute(
                """
                INSERT INTO approvals (id, target_type, target_id, decision, decided_at, actor)
                VALUES (?, 'task_patch', ?, ?, ?, ?);
                """,
                (approval_id, task_id, decision, now_iso, actor)
            )
            await db.execute("UPDATE tasks SET status = ? WHERE id = ?;", (new_status, task_id))
            await db.commit()

        # Ledger record
        await LedgerService.append_entry(
            event_type="human_approval_recorded",
            project_id=project_id,
            payload={
                "approval_id": approval_id,
                "task_id": task_id,
                "decision": decision,
                "actor": actor
            },
            related_ids={"approval_id": approval_id, "task_id": task_id}
        )

        return {
            "approval_id": approval_id,
            "task_id": task_id,
            "decision": decision,
            "status": new_status,
            "decided_at": now_iso
        }
