import os
import aiosqlite
from pathlib import Path
from typing import AsyncGenerator, Optional
from app.core.config import settings
from app.core.logging import logger

def get_db_path() -> str:
    db_url = settings.PARIKSHIT_DB_URL
    if db_url.startswith("sqlite:///"):
        path_str = db_url.replace("sqlite:///", "")
        path = Path(path_str)
        path.parent.mkdir(parents=True, exist_ok=True)
        return str(path)
    return "./data/parikshit.db"

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute("PRAGMA foreign_keys=ON;")
        yield db

async def init_db() -> None:
    db_path = get_db_path()
    logger.info(f"Initializing SQLite database at {db_path}...")
    schema_path = Path(__file__).parent / "schema.sql"
    
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found at {schema_path}")
        
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    async with aiosqlite.connect(db_path) as db:
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute("PRAGMA foreign_keys=ON;")
        await db.executescript(schema_sql)
        await db.commit()
    logger.info("Database initialized successfully with WAL mode and schema.")

async def check_db_health() -> bool:
    try:
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            cursor = await db.execute("SELECT 1;")
            row = await cursor.fetchone()
            return row is not None and row[0] == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
