import os
import shutil
import uuid
import difflib
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import aiosqlite

from app.core.config import settings
from app.core.logging import logger
from app.core.errors import AppError
from app.db.database import get_db_path
from app.services.ledger_service import LedgerService

class WorkspaceService:
    @staticmethod
    def _get_workspace_path(workspace_id: str) -> Path:
        base = Path(settings.PARIKSHIT_DATA_DIR) / "workspaces" / workspace_id
        base.mkdir(parents=True, exist_ok=True)
        return base

    @classmethod
    async def create_workspace(cls, task_id: str, revision_id: str) -> Dict[str, Any]:
        """
        Creates an isolated workspace checkout from the base revision.
        The base revision remains strictly read-only.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM repo_revisions WHERE id = ?;", (revision_id,))
            rev = await cursor.fetchone()
            if not rev:
                raise AppError(f"Revision {revision_id} not found", code="REVISION_NOT_FOUND")

            base_storage = Path(rev["storage_path"])
            project_id = rev["project_id"]

        workspace_id = f"wsp_{uuid.uuid4().hex[:12]}"
        workspace_dir = cls._get_workspace_path(workspace_id) / "repo"
        now_iso = datetime.now(timezone.utc).isoformat()

        logger.info(f"Cloning revision {revision_id} into isolated workspace {workspace_id}...")

        # Copy base repository to isolated workspace directory
        shutil.copytree(
            base_storage,
            workspace_dir,
            ignore=shutil.ignore_patterns(".git", "__pycache__", "node_modules", ".venv")
        )

        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                """
                INSERT INTO workspaces (id, task_id, base_revision_id, storage_path, status, created_at)
                VALUES (?, ?, ?, ?, 'active', ?);
                """,
                (workspace_id, task_id, revision_id, str(workspace_dir.resolve()), now_iso)
            )
            await db.commit()

        # Ledger entry
        await LedgerService.append_entry(
            event_type="workspace_created",
            project_id=project_id,
            payload={
                "workspace_id": workspace_id,
                "task_id": task_id,
                "base_revision_id": revision_id,
                "storage_path": str(workspace_dir.resolve())
            },
            related_ids={"workspace_id": workspace_id, "task_id": task_id}
        )

        return {
            "workspace_id": workspace_id,
            "task_id": task_id,
            "base_revision_id": revision_id,
            "storage_path": str(workspace_dir.resolve()),
            "status": "active"
        }

    @classmethod
    async def apply_file_changes(
        cls,
        workspace_id: str,
        files_to_update: Dict[str, str],
        agent_role: str = "builder"
    ) -> Dict[str, Any]:
        """
        Applies changes directly inside the workspace and computes unified diff.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM workspaces WHERE id = ?;", (workspace_id,))
            wsp = await cursor.fetchone()
            if not wsp:
                raise AppError(f"Workspace {workspace_id} not found", code="WORKSPACE_NOT_FOUND")

            rev_cursor = await db.execute("SELECT * FROM repo_revisions WHERE id = ?;", (wsp["base_revision_id"],))
            rev = await rev_cursor.fetchone()
            base_storage = Path(rev["storage_path"])
            project_id = rev["project_id"]

        workspace_dir = Path(wsp["storage_path"])

        # Write files inside workspace
        changed_paths = []
        for rel_path, new_content in files_to_update.items():
            target_file = (workspace_dir / rel_path).resolve()
            # Guard against path traversal out of workspace
            try:
                target_file.relative_to(workspace_dir.resolve())
            except ValueError:
                raise AppError(
                    f"Path escapes workspace boundary: {rel_path}",
                    code="PATH_ESCAPES_WORKSPACE",
                    status_code=400
                )

            target_file.parent.mkdir(parents=True, exist_ok=True)
            target_file.write_text(new_content, encoding="utf-8")
            changed_paths.append(rel_path)

        # Compute unified diff against base storage
        unified_diff = cls._compute_diff(base_storage, workspace_dir)

        patch_id = f"pat_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        import json
        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                """
                INSERT INTO patches (id, workspace_id, unified_diff, files_changed, created_by_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?);
                """,
                (patch_id, workspace_id, unified_diff, json.dumps(changed_paths), agent_role, now_iso)
            )
            await db.execute("UPDATE workspaces SET status = 'applied' WHERE id = ?;", (workspace_id,))
            await db.commit()

        # Ledger record
        await LedgerService.append_entry(
            event_type="patch_applied",
            project_id=project_id,
            payload={
                "patch_id": patch_id,
                "workspace_id": workspace_id,
                "agent_role": agent_role,
                "files_changed": changed_paths,
                "diff_length": len(unified_diff)
            },
            related_ids={"patch_id": patch_id, "workspace_id": workspace_id}
        )

        return {
            "patch_id": patch_id,
            "workspace_id": workspace_id,
            "files_changed": changed_paths,
            "unified_diff": unified_diff,
            "created_by_agent": agent_role
        }

    @classmethod
    def _compute_diff(cls, base_dir: Path, workspace_dir: Path) -> str:
        diff_lines = []
        all_files = set()

        for root, _, files in os.walk(base_dir):
            for f in files:
                rel = str((Path(root) / f).relative_to(base_dir)).replace("\\", "/")
                all_files.add(rel)

        for root, _, files in os.walk(workspace_dir):
            for f in files:
                rel = str((Path(root) / f).relative_to(workspace_dir)).replace("\\", "/")
                all_files.add(rel)

        for rel in sorted(all_files):
            orig_path = base_dir / rel
            new_path = workspace_dir / rel

            orig_lines = orig_path.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True) if orig_path.is_file() else []
            new_lines = new_path.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True) if new_path.is_file() else []

            file_diff = difflib.unified_diff(
                orig_lines,
                new_lines,
                fromfile=f"a/{rel}",
                tofile=f"b/{rel}"
            )
            diff_lines.extend(file_diff)

        return "".join(diff_lines)

    @classmethod
    async def cleanup_workspace(cls, workspace_id: str) -> bool:
        """
        Safely discards workspace files and marks status discarded.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT storage_path FROM workspaces WHERE id = ?;", (workspace_id,))
            wsp = await cursor.fetchone()
            if wsp:
                wsp_path = Path(wsp["storage_path"]).parent
                shutil.rmtree(wsp_path, ignore_errors=True)
                await db.execute("UPDATE workspaces SET status = 'discarded' WHERE id = ?;", (workspace_id,))
                await db.commit()
                return True
        return False
