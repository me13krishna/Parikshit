import pytest
import aiosqlite
import asyncio
from pathlib import Path

from app.services.ledger_service import LedgerService
from app.db.database import get_db_path, init_db

import uuid

@pytest.mark.asyncio
async def test_ledger_immutability_triggers_block_update_and_delete():
    await init_db()
    entry = await LedgerService.append_entry(
        event_type="test_event",
        payload={"message": "hello immutability"},
        project_id=f"prj_immut_{uuid.uuid4().hex[:8]}"
    )

    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        with pytest.raises(Exception) as exc_update:
            await db.execute(
                "UPDATE ledger_entries SET payload = '{\"hacked\": true}' WHERE id = ?;",
                (entry["id"],)
            )
        assert "immutable" in str(exc_update.value).lower()

    async with aiosqlite.connect(db_path) as db:
        with pytest.raises(Exception) as exc_delete:
            await db.execute(
                "DELETE FROM ledger_entries WHERE id = ?;",
                (entry["id"],)
            )
        assert "immutable" in str(exc_delete.value).lower()

@pytest.mark.asyncio
async def test_ledger_tamper_detection_reports_exact_broken_sequence():
    await init_db()
    test_pid = f"prj_tamper_{uuid.uuid4().hex[:8]}"
    
    # Append 3 entries in sequence
    e1 = await LedgerService.append_entry("step1", {"step": 1}, project_id=test_pid)
    e2 = await LedgerService.append_entry("step2", {"step": 2}, project_id=test_pid)
    e3 = await LedgerService.append_entry("step3", {"step": 3}, project_id=test_pid)

    # Initial verification should be completely valid
    initial_ver = await LedgerService.verify_chain(project_id=test_pid)
    assert initial_ver["valid"] is True
    assert initial_ver["count"] == 3

    # Tamper with row 2 by temporarily bypassing trigger in raw connection
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        await db.execute("DROP TRIGGER IF EXISTS trg_ledger_entries_no_update;")
        # Tamper payload of step 2
        await db.execute(
            "UPDATE ledger_entries SET payload = '{\"step\": 999}' WHERE id = ?;",
            (e2["id"],)
        )
        await db.commit()

    # Now verify chain: must detect failure exactly at sequence 2
    tampered_ver = await LedgerService.verify_chain(project_id=test_pid)
    assert tampered_ver["valid"] is False
    assert tampered_ver["broken_at_sequence"] == 2
    assert tampered_ver["broken_entry_id"] == e2["id"]

    # Clean up test rows and re-apply triggers
    async with aiosqlite.connect(db_path) as db:
        await db.execute("DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete;")
        await db.execute("DELETE FROM ledger_entries WHERE project_id = ?;", (test_pid,))
        await db.commit()
    await init_db()

@pytest.mark.asyncio
async def test_ledger_verify_all_chains_and_evidence_pack():
    await init_db()
    # Verify all chains
    ver = await LedgerService.verify_chain(project_id=None)
    assert "global_chain" in ver
    assert "project_chains" in ver
    assert "valid" in ver

    # Export evidence pack
    pack = await LedgerService.export_evidence_pack(project_id=None)
    assert pack["export_version"] == "2.0.0"
    assert "chain_head_hash" in pack
    assert "verification" in pack
    assert "entries" in pack
    assert isinstance(pack["entries"], list)
