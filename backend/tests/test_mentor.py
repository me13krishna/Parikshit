import pytest
import os
from pathlib import Path
import httpx
from app.main import app
from app.db.database import init_db
from app.services.ingestion_service import IngestionService
from app.services.indexer_service import IndexerService
from app.services.mentor_service import MentorService
from app.services.retrieval_service import RetrievalService
from app.services.ledger_service import LedgerService

@pytest.mark.asyncio
async def test_sprint1_mentor_flow():
    await init_db()

    demo_dir = Path("data/demo/calculator_app").resolve()
    assert demo_dir.exists(), "Demo directory should exist"

    # 1. Test Ingestion
    ingest_res = await IngestionService.ingest_repository(
        source_type="local",
        source_uri=str(demo_dir),
        name="Calculator Demo"
    )
    assert ingest_res["project_id"].startswith("prj_")
    assert ingest_res["revision_id"].startswith("rev_")
    assert ingest_res["file_count"] >= 3

    project_id = ingest_res["project_id"]
    revision_id = ingest_res["revision_id"]

    # 2. Test Indexing
    index_res = await IndexerService.index_revision(revision_id)
    assert index_res["status"] == "complete"
    assert index_res["files"] >= 3
    assert index_res["symbols"] >= 3  # Calculator, add, subtract, divide

    # 3. Test Retrieval
    results = await RetrievalService.retrieve(revision_id, "divide", limit=3)
    assert len(results) > 0
    assert any("divide" in r["content"] or r["name"] == "divide" for r in results)

    # 4. Test Architecture Overview
    overview = await MentorService.generate_architecture_overview(revision_id)
    assert "components" in overview
    assert len(overview["components"]) > 0

    # 5. Test Mentor Q&A
    answer = await MentorService.ask_mentor(
        project_id=project_id,
        revision_id=revision_id,
        question="How does division handle zero division?"
    )
    assert answer["status"] in ["grounded", "partially_grounded"]
    assert "answer_markdown" in answer
    assert len(answer["citations"]) > 0
    # Check that at least one citation is verified
    verified_citations = [c for c in answer["citations"] if c.get("verified")]
    assert len(verified_citations) > 0

    # 6. Test Guided Tours
    tours = await MentorService.generate_guided_tours(revision_id)
    assert len(tours) > 0
    assert len(tours[0]["steps"]) > 0

    # 7. Check Ledger Integrity
    verification = await LedgerService.verify_chain(project_id=project_id)
    assert verification["valid"] is True
    assert verification["count"] >= 3  # ingested, indexed, overview, qa
