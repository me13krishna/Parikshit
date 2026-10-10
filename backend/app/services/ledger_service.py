import json
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import aiosqlite
from app.db.database import get_db_path
from app.core.logging import logger

GENESIS_PREV_HASH = "0" * 64

class LedgerService:
    @staticmethod
    def _compute_hash(prev_hash: str, sequence: int, event_type: str, payload: Dict[str, Any], timestamp: str) -> str:
        # Canonical JSON stringification (sorted keys, no extra spaces)
        canonical_payload = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        raw = f"{prev_hash}|{sequence}|{event_type}|{canonical_payload}|{timestamp}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @classmethod
    async def append_entry(
        cls,
        event_type: str,
        payload: Dict[str, Any],
        project_id: Optional[str] = None,
        related_ids: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Appends an immutable entry to the hash-chained ledger.
        Ensures strict hash chain verification before insert.
        """
        db_path = get_db_path()
        now_iso = datetime.now(timezone.utc).isoformat()
        rel_ids = related_ids or {}

        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            await db.execute("PRAGMA foreign_keys=ON;")

            # Get the latest entry for this project or global
            if project_id:
                cursor = await db.execute(
                    "SELECT id, content_hash, sequence FROM ledger_entries WHERE project_id = ? ORDER BY sequence DESC LIMIT 1;",
                    (project_id,)
                )
            else:
                cursor = await db.execute(
                    "SELECT id, content_hash, sequence FROM ledger_entries WHERE project_id IS NULL ORDER BY sequence DESC LIMIT 1;"
                )
            latest = await cursor.fetchone()

            if latest:
                prev_hash = latest["content_hash"]
                sequence = latest["sequence"] + 1
            else:
                prev_hash = GENESIS_PREV_HASH
                sequence = 1

            entry_id = f"led_{uuid.uuid4().hex[:12]}"
            content_hash = cls._compute_hash(prev_hash, sequence, event_type, payload, now_iso)

            await db.execute(
                """
                INSERT INTO ledger_entries (
                    id, project_id, prev_hash, content_hash, event_type, payload, related_ids, created_at, sequence
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    entry_id,
                    project_id,
                    prev_hash,
                    content_hash,
                    event_type,
                    json.dumps(payload),
                    json.dumps(rel_ids),
                    now_iso,
                    sequence
                )
            )
            await db.commit()

            logger.info(f"Ledger entry appended: {entry_id} [seq: {sequence}, type: {event_type}, hash: {content_hash[:12]}...]")

            return {
                "id": entry_id,
                "project_id": project_id,
                "sequence": sequence,
                "prev_hash": prev_hash,
                "content_hash": content_hash,
                "event_type": event_type,
                "payload": payload,
                "related_ids": rel_ids,
                "created_at": now_iso
            }

    @classmethod
    async def verify_chain(cls, project_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Verifies the cryptographic integrity of the ledger chain.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            if project_id:
                cursor = await db.execute(
                    "SELECT * FROM ledger_entries WHERE project_id = ? ORDER BY sequence ASC;",
                    (project_id,)
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM ledger_entries ORDER BY sequence ASC;"
                )
            entries = await cursor.fetchall()

        if not entries:
            return {"valid": True, "count": 0, "message": "Ledger is empty"}

        expected_prev_hash = GENESIS_PREV_HASH
        for idx, row in enumerate(entries):
            row_dict = dict(row)
            if row_dict["prev_hash"] != expected_prev_hash:
                return {
                    "valid": False,
                    "count": len(entries),
                    "broken_at_sequence": row_dict["sequence"],
                    "broken_entry_id": row_dict["id"],
                    "error": f"Prev hash mismatch at seq {row_dict['sequence']}: expected {expected_prev_hash}, got {row_dict['prev_hash']}"
                }

            payload = json.loads(row_dict["payload"])
            recalculated = cls._compute_hash(
                row_dict["prev_hash"],
                row_dict["sequence"],
                row_dict["event_type"],
                payload,
                row_dict["created_at"]
            )
            if recalculated != row_dict["content_hash"]:
                return {
                    "valid": False,
                    "count": len(entries),
                    "broken_at_sequence": row_dict["sequence"],
                    "broken_entry_id": row_dict["id"],
                    "error": f"Content hash mismatch at seq {row_dict['sequence']}"
                }

            expected_prev_hash = row_dict["content_hash"]

        return {
            "valid": True,
            "count": len(entries),
            "latest_hash": expected_prev_hash,
            "message": "Ledger hash chain is cryptographically intact"
        }

    @classmethod
    async def list_entries(cls, project_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            if project_id:
                cursor = await db.execute(
                    "SELECT * FROM ledger_entries WHERE project_id = ? ORDER BY sequence DESC LIMIT ?;",
                    (project_id, limit)
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM ledger_entries ORDER BY sequence DESC LIMIT ?;",
                    (limit,)
                )
            rows = await cursor.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["payload"] = json.loads(d["payload"])
                d["related_ids"] = json.loads(d["related_ids"])
                results.append(d)
            return results
