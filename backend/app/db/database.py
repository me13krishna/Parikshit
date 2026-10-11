import os
import aiosqlite
from pathlib import Path
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging import logger

def get_db_path() -> str:
    db_url = settings.PARIKSHIT_DB_URL
    if db_url.startswith("sqlite:///"):
        path_str = db_url.replace("sqlite:///", "")
        path = Path(path_str)
        path.parent.mkdir(parents=True, exist_ok=True)
        return str(path)
    if "://" in db_url:
        raise ValueError(f"Unsupported database URL scheme: {db_url}. Only SQLite (sqlite:///) is supported.")
    path = Path(db_url)
    path.parent.mkdir(parents=True, exist_ok=True)
    return str(path)

@asynccontextmanager
async def get_connection() -> AsyncGenerator[aiosqlite.Connection, None]:
    """
    Centralized database connection context manager.
    Guarantees WAL mode, foreign key enforcement, busy timeout, and Row factory.
    """
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute("PRAGMA foreign_keys=ON;")
        await db.execute("PRAGMA busy_timeout=5000;")
        yield db

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """FastAPI dependency for database session."""
    async with get_connection() as db:
        yield db

async def init_db() -> None:
    """
    Versioned migration runner for SQLite.
    Creates `schema_migrations` table and applies numbered .sql migration files in order.
    """
    db_path = get_db_path()
    logger.info(f"Initializing SQLite database at {db_path}...")

    # Look for migrations in backend/migrations or app/db/schema.sql
    migrations_dir = Path(__file__).parent.parent.parent / "migrations"
    schema_path = Path(__file__).parent / "schema.sql"

    async with get_connection() as db:
        # Create migrations tracking table
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            );
            """
        )
        await db.commit()

        # Find migration scripts
        migration_files = []
        if migrations_dir.exists():
            migration_files = sorted(migrations_dir.glob("*.sql"))

        if not migration_files and schema_path.exists():
            migration_files = [schema_path]

        for mig in migration_files:
            v_name = mig.stem
            cursor = await db.execute("SELECT 1 FROM schema_migrations WHERE version = ?;", (v_name,))
            if await cursor.fetchone():
                continue

            logger.info(f"Applying schema migration: {mig.name}...")
            sql_content = mig.read_text(encoding="utf-8")
            await db.executescript(sql_content)
            now_iso = datetime.now(timezone.utc).isoformat()
            await db.execute("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);", (v_name, now_iso))
            await db.commit()
            logger.info(f"Successfully applied migration: {mig.name}")

    logger.info("Database initialized successfully with WAL mode, foreign keys, and migration runner.")

async def check_db_health() -> bool:
    try:
        async with get_connection() as db:
            cursor = await db.execute("SELECT 1;")
            row = await cursor.fetchone()
            return row is not None and row[0] == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
