import json
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Union
import aiosqlite
from app.db.database import get_db_path
from app.core.logging import logger

GENESIS_PREV_HASH = "0" * 64

class LedgerService:
    @staticmethod
    def _compute_hash(
        prev_hash: str,
        sequence: int,
        event_type: str,
        payload: Union[Dict[str, Any], str],
        timestamp: str
    ) -> str:
        if isinstance(payload, str):
            try:
                parsed = json.loads(payload)
                canonical_payload = json.dumps(parsed, sort_keys=True, separators=(',', ':'))
            except Exception:
                canonical_payload = payload
        else:
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
        Uses atomic BEGIN IMMEDIATE transaction and stores canonical payload.
        """
        db_path = get_db_path()
        now_iso = datetime.now(timezone.utc).isoformat()
        rel_ids = related_ids or {}
        canonical_payload = json.dumps(payload, sort_keys=True, separators=(',', ':'))

        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            await db.execute("PRAGMA foreign_keys=ON;")
            await db.execute("BEGIN IMMEDIATE;")
            try:
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
                content_hash = cls._compute_hash(prev_hash, sequence, event_type, canonical_payload, now_iso)

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
                        canonical_payload,
                        json.dumps(rel_ids, sort_keys=True),
                        now_iso,
                        sequence
                    )
                )
                await db.commit()
            except Exception:
                await db.rollback()
                raise

            logger.info(f"Ledger entry appended: {entry_id} [seq: {sequence}, proj: {project_id or 'global'}, type: {event_type}, hash: {content_hash[:12]}...]")

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
    def _verify_entry_list(cls, entries: List[Dict[str, Any]], chain_label: str) -> Dict[str, Any]:
        if not entries:
            return {
                "valid": True,
                "chain": chain_label,
                "count": 0,
                "latest_hash": None,
                "message": f"Chain '{chain_label}' is empty"
            }

        expected_prev_hash = GENESIS_PREV_HASH
        for row in entries:
            if row["prev_hash"] != expected_prev_hash:
                return {
                    "valid": False,
                    "chain": chain_label,
                    "count": len(entries),
                    "broken_at_sequence": row["sequence"],
                    "broken_entry_id": row["id"],
                    "error": f"Prev hash mismatch at seq {row['sequence']}: expected {expected_prev_hash}, got {row['prev_hash']}"
                }

            # Recalculate directly on stored canonical payload string
            recalculated = cls._compute_hash(
                row["prev_hash"],
                row["sequence"],
                row["event_type"],
                row["payload"],
                row["created_at"]
            )
            if recalculated != row["content_hash"]:
                return {
                    "valid": False,
                    "chain": chain_label,
                    "count": len(entries),
                    "broken_at_sequence": row["sequence"],
                    "broken_entry_id": row["id"],
                    "error": f"Content hash mismatch at seq {row['sequence']}: stored {row['content_hash']}, recalculated {recalculated}"
                }

            expected_prev_hash = row["content_hash"]

        return {
            "valid": True,
            "chain": chain_label,
            "count": len(entries),
            "latest_hash": expected_prev_hash,
            "message": f"Chain '{chain_label}' is cryptographically intact"
        }

    @classmethod
    async def verify_chain(cls, project_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Verifies cryptographic integrity of the ledger chain.
        If project_id is given, verifies that project's chain.
        If project_id is None, verifies ALL chains (global and all projects) and reports per-chain results.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row

            if project_id:
                cursor = await db.execute(
                    "SELECT * FROM ledger_entries WHERE project_id = ? ORDER BY sequence ASC;",
                    (project_id,)
                )
                entries = [dict(r) for r in await cursor.fetchall()]
                return cls._verify_entry_list(entries, chain_label=f"project:{project_id}")

            # Verify all chains in a single fast query
            cursor = await db.execute(
                "SELECT * FROM ledger_entries ORDER BY sequence ASC;"
            )
            all_rows = [dict(r) for r in await cursor.fetchall()]

            global_entries: List[Dict[str, Any]] = []
            project_groups: Dict[str, List[Dict[str, Any]]] = {}
            for row in all_rows:
                pid = row.get("project_id")
                if pid:
                    project_groups.setdefault(pid, []).append(row)
                else:
                    global_entries.append(row)

            global_result = cls._verify_entry_list(global_entries, chain_label="global")
            project_results: Dict[str, Dict[str, Any]] = {}
            all_valid = global_result["valid"]

            for pid, p_entries in project_groups.items():
                res = cls._verify_entry_list(p_entries, chain_label=f"project:{pid}")
                project_results[pid] = res
                if not res["valid"]:
                    all_valid = False

            return {
                "valid": all_valid,
                "count": len(all_rows),
                "total_entries": len(all_rows),
                "global_chain": global_result,
                "project_chains": project_results,
                "message": "All ledger chains cryptographically verified" if all_valid else "Ledger chain integrity failure detected"
            }

    @classmethod
    async def list_entries(cls, project_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            rows = []
            if project_id:
                cursor = await db.execute(
                    "SELECT * FROM ledger_entries WHERE project_id = ? ORDER BY sequence DESC LIMIT ?;",
                    (project_id, limit)
                )
                rows = await cursor.fetchall()
            if not rows:
                cursor = await db.execute(
                    "SELECT * FROM ledger_entries ORDER BY sequence DESC LIMIT ?;",
                    (limit,)
                )
                rows = await cursor.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                try:
                    d["payload"] = json.loads(d["payload"])
                except Exception:
                    pass
                try:
                    d["related_ids"] = json.loads(d["related_ids"])
                except Exception:
                    pass
                results.append(d)
            return results

    @classmethod
    async def export_evidence_pack(cls, project_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Produces an exportable tamper-evident evidence pack.
        """
        verification = await cls.verify_chain(project_id=project_id)
        entries = await cls.list_entries(project_id=project_id, limit=2000)
        head_hash = entries[0]["content_hash"] if entries else None

        return {
            "export_version": "2.0.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "project_id": project_id,
            "chain_head_hash": head_hash,
            "verification": verification,
            "total_entries": len(entries),
            "entries": entries
        }
