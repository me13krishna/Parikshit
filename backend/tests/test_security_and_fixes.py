import pytest
import zipfile
import io
from pathlib import Path
from app.services.retrieval_service import RetrievalService
from app.services.ingestion_service import IngestionService
from app.services.indexer_service import IndexerService
from app.core.errors import AppError

def test_tuple_annotations_and_classifier():
    kind, score = IndexerService._classify_file("backend/app/main.py")
    assert kind == "source"
    assert score == 1.0

    test_kind, test_score = IndexerService._classify_file("tests/test_sample.py")
    assert test_kind == "test"
    assert test_score == 0.7

def test_secret_redaction_in_retrieval():
    text_with_secrets = (
        "def connect():\n"
        "    aws_key = 'AKIAIOSFODNN7EXAMPLE'\n"
        "    api_token = 'sk_live_1234567890abcdef'\n"
        "    header = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummytoken'\n"
        "    return True\n"
    )
    redacted = RetrievalService.redact_secrets(text_with_secrets)
    assert "AKIAIOSFODNN7EXAMPLE" not in redacted
    assert "sk_live_1234567890abcdef" not in redacted
    assert "[REDACTED_SECRET]" in redacted
    assert "return True" in redacted

@pytest.mark.asyncio
async def test_safe_zip_ingestion(tmp_path: Path):
    # 1. Create a valid test zip file
    zip_path = tmp_path / "valid_repo.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("module.py", "def hello():\n    return 'world'\n")
        zf.writestr("README.md", "# Test Zip Repo\n")

    res = await IngestionService.ingest_repository(
        source_type="zip",
        source_uri=str(zip_path),
        name="Valid Zip Project"
    )
    assert res["project_id"].startswith("prj_")
    assert res["file_count"] >= 2
    assert Path(res["storage_path"]).exists()

@pytest.mark.asyncio
async def test_zip_path_traversal_rejected(tmp_path: Path):
    # Create a malicious zip file attempting Zip Slip / path traversal
    zip_path = tmp_path / "malicious.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("../../../evil.txt", "exploit")

    with pytest.raises(AppError) as exc_info:
        await IngestionService.ingest_repository(
            source_type="zip",
            source_uri=str(zip_path),
            name="Malicious Zip"
        )
    assert exc_info.value.code == "PATH_TRAVERSAL_DETECTED"
