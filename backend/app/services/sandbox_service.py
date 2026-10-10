import os
import sys
import subprocess
import time
import uuid
import re
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import aiosqlite

from app.core.config import settings
from app.core.logging import logger
from app.core.errors import AppError
from app.db.database import get_db_path
from app.services.ledger_service import LedgerService

class SandboxService:
    @classmethod
    async def run_command(
        cls,
        workspace_id: str,
        command: str = "pytest -v",
        timeout_sec: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes a test or verification command inside the workspace boundary.
        Uses Docker if enabled, otherwise safe isolated subprocess.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM workspaces WHERE id = ?;", (workspace_id,))
            wsp = await cursor.fetchone()
            if not wsp:
                raise AppError(f"Workspace {workspace_id} not found", code="WORKSPACE_NOT_FOUND")

            storage_path = Path(wsp["storage_path"])
            task_id = wsp["task_id"]

            task_cursor = await db.execute("SELECT project_id FROM tasks WHERE id = ?;", (task_id,))
            task = await task_cursor.fetchone()
            project_id = task["project_id"] if task else None

        run_id = f"run_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        timeout = timeout_sec or settings.SANDBOX_TIMEOUT_SEC

        logger.info(f"Sandbox executing '{command}' in workspace {workspace_id} (timeout={timeout}s)...")

        start_time = time.time()
        exit_code, stdout, stderr, run_status = cls._execute_in_environment(storage_path, command, timeout)
        duration_ms = int((time.time() - start_time) * 1000)

        # Parse test results if pytest was run
        test_outcomes = cls._parse_pytest_output(stdout + "\n" + stderr)

        # Save to database
        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                """
                INSERT INTO sandbox_runs (
                    id, workspace_id, command, exit_code, stdout, stderr, duration_ms, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (run_id, workspace_id, command, exit_code, stdout, stderr, duration_ms, run_status, now_iso)
            )

            for t in test_outcomes:
                test_pk = f"tst_{uuid.uuid4().hex[:12]}"
                await db.execute(
                    """
                    INSERT INTO test_results (id, sandbox_run_id, test_id, outcome, message, duration_ms)
                    VALUES (?, ?, ?, ?, ?, ?);
                    """,
                    (test_pk, run_id, t["test_id"], t["outcome"], t.get("message"), t.get("duration_ms", 0))
                )
            await db.commit()

        # Append to Ledger
        await LedgerService.append_entry(
            event_type="sandbox_run_completed",
            project_id=project_id,
            payload={
                "run_id": run_id,
                "workspace_id": workspace_id,
                "command": command,
                "exit_code": exit_code,
                "status": run_status,
                "duration_ms": duration_ms,
                "total_tests": len(test_outcomes),
                "passed_tests": sum(1 for t in test_outcomes if t["outcome"] == "passed")
            },
            related_ids={"run_id": run_id, "workspace_id": workspace_id}
        )

        return {
            "run_id": run_id,
            "workspace_id": workspace_id,
            "command": command,
            "exit_code": exit_code,
            "status": run_status,
            "duration_ms": duration_ms,
            "stdout": stdout,
            "stderr": stderr,
            "tests": test_outcomes
        }

    @classmethod
    def _execute_in_environment(
        cls,
        workspace_path: Path,
        command: str,
        timeout: int
    ) -> Tuple[int, str, str, str]:
        # Clean environment to prevent secret leakage while preserving system essentials
        clean_env = {
            "PATH": os.environ.get("PATH", ""),
            "PYTHONPATH": str(workspace_path.resolve()),
            "PYTHONDONTWRITEBYTECODE": "1"
        }
        for k in ["SystemRoot", "WINDIR", "SYSTEMROOT", "TEMP", "TMP"]:
            if k in os.environ:
                clean_env[k] = os.environ[k]

        # If Docker is enabled, attempt docker execution
        if settings.SANDBOX_ENABLED:
            try:
                docker_cmd = [
                    "docker", "run", "--rm",
                    "--network", "none",
                    "--memory", "512m",
                    "--cpus", "1.0",
                    "-v", f"{workspace_path.resolve()}:/workspace",
                    "-w", "/workspace",
                    settings.SANDBOX_IMAGE,
                    "bash", "-c", command
                ]
                res = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=timeout)
                status = "succeeded" if res.returncode == 0 else "failed"
                return res.returncode, res.stdout, res.stderr, status
            except Exception as e:
                logger.warning(f"Docker sandbox execution failed, falling back to local isolation: {e}")

        # Local isolated subprocess execution
        try:
            # If command starts with pytest or python, execute via python
            if command.startswith("pytest"):
                py_exec = sys.executable
                cmd_args = [py_exec, "-m"] + command.split()
            else:
                cmd_args = command.split()

            res = subprocess.run(
                cmd_args,
                cwd=str(workspace_path),
                env=clean_env,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            status = "succeeded" if res.returncode == 0 else "failed"
            return res.returncode, res.stdout, res.stderr, status

        except subprocess.TimeoutExpired:
            return 124, "", f"Command timed out after {timeout} seconds", "timeout"
        except Exception as exc:
            return 1, "", str(exc), "failed"

    @classmethod
    def _parse_pytest_output(cls, output: str) -> List[Dict[str, Any]]:
        results = []
        # Pattern matching: test_file.py::test_func PASSED / FAILED
        lines = output.splitlines()
        for line in lines:
            m = re.search(r"([\w/\\]+\.py::[\w_]+)\s+(PASSED|FAILED|SKIPPED|ERROR)", line)
            if m:
                test_id = m.group(1).replace("\\", "/")
                outcome = m.group(2).lower()
                results.append({
                    "test_id": test_id,
                    "outcome": outcome,
                    "message": line.strip()
                })
        return results
