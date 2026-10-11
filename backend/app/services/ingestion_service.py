import os
import shutil
import subprocess
import uuid
import hashlib
import json
import zipfile
import asyncio
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import aiosqlite

from app.core.config import settings
from app.core.logging import logger
from app.core.errors import AppError
from app.db.database import get_db_path
from app.services.ledger_service import LedgerService

class IngestionService:
    @staticmethod
    def _get_project_dir(project_id: str) -> Path:
        base_dir = Path(settings.PARIKSHIT_DATA_DIR) / "projects" / project_id
        base_dir.mkdir(parents=True, exist_ok=True)
        return base_dir

    @classmethod
    async def ingest_repository(
        cls,
        source_type: str,
        source_uri: str,
        name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Clones or copies repository into read-only storage, records commit SHA,
        enforces security and size limits, and registers project + revision.
        """
        project_id = f"prj_{uuid.uuid4().hex[:12]}"
        revision_id = f"rev_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        project_name = name or Path(source_uri.rstrip("/").split("/")[-1]).stem or "unnamed_project"
        dest_dir = cls._get_project_dir(project_id) / "checkout"

        logger.info(f"Ingesting project {project_name} from {source_uri} (type: {source_type}) into {dest_dir}...")

        commit_sha = "local_head"
        if source_type == "git_url":
            commit_sha = await asyncio.to_thread(cls._clone_git, source_uri, dest_dir)
        elif source_type in ["local", "zip"]:
            commit_sha = await asyncio.to_thread(cls._copy_local, source_uri, dest_dir)
        else:
            raise AppError(f"Unsupported source type: {source_type}", code="INVALID_SOURCE_TYPE")

        # Analyze storage, file count, and languages
        file_count, byte_size, line_count, languages = await asyncio.to_thread(cls._scan_directory, dest_dir)

        # Enforce limits
        max_bytes = settings.MAX_REPO_SIZE_MB * 1024 * 1024
        if byte_size > max_bytes:
            shutil.rmtree(dest_dir, ignore_errors=True)
            raise AppError(
                f"Repository size ({byte_size / (1024*1024):.1f}MB) exceeds limit of {settings.MAX_REPO_SIZE_MB}MB",
                code="REPO_SIZE_EXCEEDED"
            )

        if file_count > settings.MAX_FILE_COUNT:
            shutil.rmtree(dest_dir, ignore_errors=True)
            raise AppError(
                f"File count ({file_count}) exceeds limit of {settings.MAX_FILE_COUNT}",
                code="FILE_COUNT_EXCEEDED"
            )

        # Persist in DB
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                """
                INSERT INTO projects (id, name, source_type, source_uri, created_at, status)
                VALUES (?, ?, ?, ?, ?, 'active');
                """,
                (project_id, project_name, source_type, source_uri, now_iso)
            )

            await db.execute(
                """
                INSERT INTO repo_revisions (
                    id, project_id, commit_sha, storage_path, file_count, byte_size, line_count, languages, index_status, indexed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL);
                """,
                (
                    revision_id,
                    project_id,
                    commit_sha,
                    str(dest_dir.resolve()),
                    file_count,
                    byte_size,
                    line_count,
                    json.dumps(languages)
                )
            )
            await db.commit()

        # Append to Ledger
        await LedgerService.append_entry(
            event_type="project_ingested",
            project_id=project_id,
            payload={
                "project_id": project_id,
                "revision_id": revision_id,
                "project_name": project_name,
                "commit_sha": commit_sha,
                "file_count": file_count,
                "byte_size": byte_size,
                "languages": languages
            },
            related_ids={"project_id": project_id, "revision_id": revision_id}
        )

        return {
            "project_id": project_id,
            "revision_id": revision_id,
            "name": project_name,
            "commit_sha": commit_sha,
            "storage_path": str(dest_dir.resolve()),
            "file_count": file_count,
            "byte_size": byte_size,
            "line_count": line_count,
            "languages": languages,
            "index_status": "pending"
        }

    @staticmethod
    def _validate_git_url(git_url: str) -> None:
        if git_url.startswith("-"):
            raise AppError("Git URL cannot start with a dash", code="INVALID_GIT_URL")
        parsed = urllib.parse.urlparse(git_url)
        if parsed.scheme.lower() != "https":
            raise AppError("Git clone only permits https:// URLs", code="INVALID_GIT_URL")

        allowed_hosts = [h.strip().lower() for h in settings.ALLOWED_GIT_HOSTS.split(",") if h.strip()]
        host = (parsed.hostname or "").lower()
        if host not in allowed_hosts:
            raise AppError(
                f"Git host '{host}' is not in allowed hosts: {allowed_hosts}",
                code="GIT_HOST_NOT_ALLOWED"
            )

    @classmethod
    def _clone_git(cls, git_url: str, dest_dir: Path) -> str:
        cls._validate_git_url(git_url)
        dest_dir.parent.mkdir(parents=True, exist_ok=True)
        if dest_dir.exists():
            shutil.rmtree(dest_dir)

        env = {
            **os.environ,
            "GIT_TERMINAL_PROMPT": "0"
        }
        cmd = ["git", "clone", "--depth", "1", "--", git_url, str(dest_dir)]
        res = subprocess.run(cmd, capture_output=True, text=True, env=env)
        if res.returncode != 0:
            raise AppError(f"Git clone failed: {res.stderr.strip()}", code="GIT_CLONE_FAILED")

        res_sha = subprocess.run(
            ["git", "-C", str(dest_dir), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            env=env
        )
        return res_sha.stdout.strip() if res_sha.returncode == 0 else "unknown_sha"

    @classmethod
    def _validate_local_source(cls, source_path: Path) -> None:
        import tempfile
        allowed_roots = [
            Path(r.strip()).resolve()
            for r in settings.PARIKSHIT_LOCAL_SOURCE_ROOTS.split(",")
            if r.strip()
        ]
        allowed_roots.append(Path(tempfile.gettempdir()).resolve())
        resolved_src = source_path.resolve()
        is_allowed = False
        for root in allowed_roots:
            try:
                resolved_src.relative_to(root)
                is_allowed = True
                break
            except ValueError:
                continue

        if not is_allowed and settings.PARIKSHIT_ENV != "development":
            raise AppError(
                f"Local source path '{source_path}' is not within allowed source roots",
                code="LOCAL_SOURCE_DISALLOWED"
            )
        elif not is_allowed:
            # In development, also check repository workspace root
            cwd = Path.cwd().resolve()
            try:
                resolved_src.relative_to(cwd)
                is_allowed = True
            except ValueError:
                pass
            if not is_allowed:
                raise AppError(
                    f"Local source path '{source_path}' is outside allowed roots",
                    code="LOCAL_SOURCE_DISALLOWED"
                )

    @classmethod
    def _copy_local(cls, source_path: str, dest_dir: Path) -> str:
        src = Path(source_path).resolve()
        if not src.exists():
            raise AppError(f"Source path {source_path} not found", code="SOURCE_PATH_NOT_FOUND")

        cls._validate_local_source(src)

        dest_dir.parent.mkdir(parents=True, exist_ok=True)
        if dest_dir.exists():
            shutil.rmtree(dest_dir)

        max_file_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        max_repo_bytes = settings.MAX_REPO_SIZE_MB * 1024 * 1024

        if src.is_file() and (src.suffix.lower() == ".zip" or zipfile.is_zipfile(src)):
            dest_dir.mkdir(parents=True, exist_ok=True)
            total_uncompressed = 0
            with zipfile.ZipFile(src, "r") as zf:
                for member in zf.infolist():
                    member_path = Path(member.filename)
                    if member_path.is_absolute() or ".." in member_path.parts:
                        raise AppError(
                            f"Malicious ZIP archive: path traversal detected ({member.filename})",
                            code="PATH_TRAVERSAL_DETECTED"
                        )
                    target = (dest_dir / member_path).resolve()
                    try:
                        target.relative_to(dest_dir.resolve())
                    except ValueError:
                        raise AppError(
                            f"Malicious ZIP archive: path escapes destination ({member.filename})",
                            code="PATH_TRAVERSAL_DETECTED"
                        )
                    if member.file_size > max_file_bytes:
                        raise AppError(
                            f"ZIP member {member.filename} exceeds max file size of {settings.MAX_FILE_SIZE_MB}MB",
                            code="FILE_SIZE_EXCEEDED"
                        )
                    total_uncompressed += member.file_size
                    if total_uncompressed > max_repo_bytes:
                        raise AppError(
                            f"ZIP archive total uncompressed size exceeds limit of {settings.MAX_REPO_SIZE_MB}MB",
                            code="REPO_SIZE_EXCEEDED"
                        )
                    zf.extract(member, dest_dir)
        elif src.is_dir():
            shutil.copytree(
                src,
                dest_dir,
                symlinks=False,
                ignore_dangling_symlinks=True,
                ignore=shutil.ignore_patterns(".git", "__pycache__", "node_modules", ".venv")
            )
        else:
            raise AppError("Source must be a valid directory or .zip archive", code="UNSUPPORTED_FORMAT")

        # Compute content hash as commit SHA
        hasher = hashlib.sha256()
        for root, _, files in os.walk(dest_dir, followlinks=False):
            for file in sorted(files):
                p = Path(root) / file
                if p.is_symlink():
                    continue
                hasher.update(file.encode("utf-8"))
                try:
                    hasher.update(p.read_bytes())
                except Exception:
                    pass
        return hasher.hexdigest()[:16]

    @staticmethod
    def _scan_directory(dir_path: Path) -> Tuple[int, int, int, Dict[str, int]]:
        total_files = 0
        total_bytes = 0
        total_lines = 0
        languages: Dict[str, int] = {}
        max_file_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

        EXT_MAP = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".jsx": "javascript",
            ".html": "html",
            ".css": "css",
            ".json": "json",
            ".md": "markdown",
            ".sql": "sql",
            ".sh": "shell",
            ".ps1": "powershell"
        }

        SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv", ".next", "dist", "build"}

        for root, dirs, files in os.walk(dir_path, followlinks=False):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in files:
                fpath = Path(root) / f
                if fpath.is_symlink():
                    continue
                try:
                    sz = fpath.stat().st_size
                    if sz > max_file_bytes:
                        raise AppError(
                            f"File '{f}' ({sz / (1024*1024):.1f}MB) exceeds limit of {settings.MAX_FILE_SIZE_MB}MB",
                            code="FILE_SIZE_EXCEEDED"
                        )
                    total_bytes += sz
                    total_files += 1

                    ext = fpath.suffix.lower()
                    lang = EXT_MAP.get(ext, "other")
                    languages[lang] = languages.get(lang, 0) + 1

                    # Count lines for text files
                    if sz < 2 * 1024 * 1024:
                        try:
                            with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
                                total_lines += sum(1 for _ in fp)
                        except Exception:
                            pass
                except AppError:
                    raise
                except Exception:
                    pass

        return total_files, total_bytes, total_lines, languages
