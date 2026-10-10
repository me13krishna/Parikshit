import pytest
from pathlib import Path
import httpx
from app.main import app
from app.services.ledger_service import LedgerService
from app.services.citation_verifier import CitationVerifier
from app.db.database import init_db

@pytest.mark.asyncio
async def test_init_db():
    await init_db()

@pytest.mark.asyncio
async def test_ledger_append_and_verify():
    # Append test event
    entry1 = await LedgerService.append_entry(
        event_type="test_event_1",
        payload={"msg": "first event"}
    )
    assert entry1["sequence"] >= 1
    assert entry1["content_hash"] is not None

    entry2 = await LedgerService.append_entry(
        event_type="test_event_2",
        payload={"msg": "second event"}
    )
    assert entry2["sequence"] == entry1["sequence"] + 1
    assert entry2["prev_hash"] == entry1["content_hash"]

    # Verify chain
    verification = await LedgerService.verify_chain()
    assert verification["valid"] is True
    assert verification["count"] >= 2

@pytest.mark.asyncio
async def test_citation_verifier(tmp_path):
    # Create sample file
    test_file = tmp_path / "sample.py"
    test_file.write_text("def hello():\n    return 'world'\n", encoding="utf-8")

    # Valid citation
    valid_citation = {
        "path": "sample.py",
        "start_line": 1,
        "end_line": 2
    }
    res = CitationVerifier.verify_single_citation(tmp_path, valid_citation)
    assert res["verified"] is True
    assert "def hello():" in res["snippet"]
    assert res["snippet_hash"].startswith("sha256:")

    # Out-of-bounds citation
    invalid_citation = {
        "path": "sample.py",
        "start_line": 10,
        "end_line": 20
    }
    res_invalid = CitationVerifier.verify_single_citation(tmp_path, invalid_citation)
    assert res_invalid["verified"] is False

    # Path traversal attempt
    traversal_citation = {
        "path": "../../secret.txt",
        "start_line": 1,
        "end_line": 2
    }
    res_traversal = CitationVerifier.verify_single_citation(tmp_path, traversal_citation)
    assert res_traversal["verified"] is False

@pytest.mark.asyncio
async def test_health_api():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["data"]["status"] == "ok"
        assert data["data"]["database"] == "ok"
