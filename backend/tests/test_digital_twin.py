import pytest
from pathlib import Path
from app.main import app
from app.db.database import init_db
from app.services.ingestion_service import IngestionService
from app.services.indexer_service import IndexerService
from app.services.task_service import TaskService
from app.services.twin_service import DigitalTwinService
from app.services.ledger_service import LedgerService

@pytest.mark.asyncio
async def test_sprint4_digital_twin_and_impact():
    await init_db()

    demo_dir = Path("data/demo/calculator_app").resolve()
    assert demo_dir.exists()

    # 1. Ingest & Index
    ingest_res = await IngestionService.ingest_repository(
        source_type="local",
        source_uri=str(demo_dir),
        name="Calculator Digital Twin Test"
    )
    project_id = ingest_res["project_id"]
    revision_id = ingest_res["revision_id"]

    await IndexerService.index_revision(revision_id)

    # 2. Extract Dependency Graph
    graph = await DigitalTwinService.get_dependency_graph(project_id)
    assert graph["total_nodes"] >= 3
    assert any("calculator.py" in n["path"] for n in graph["nodes"])
    assert any("test_calculator.py" in n["path"] for n in graph["nodes"])

    # 3. Create Task & Predict Impact
    task_res = await TaskService.create_task(
        project_id=project_id,
        request_text="Add power exponent method to calculator"
    )
    task_id = task_res["task_id"]

    prediction = await DigitalTwinService.predict_impact(task_id)
    assert "prediction" in prediction
    assert len(prediction["prediction"]["predicted_files"]) > 0

    # 4. Build and Compare Predicted vs Actual Impact
    build_res = await TaskService.approve_and_build(task_id)
    impact_comp = await DigitalTwinService.compare_predicted_vs_actual(task_id)

    assert "predicted_files" in impact_comp
    assert "actual_files" in impact_comp
    assert "metrics" in impact_comp
    assert "precision" in impact_comp["metrics"]
    assert "recall" in impact_comp["metrics"]

    # 5. Ledger verification
    chain = await LedgerService.verify_chain(project_id=project_id)
    assert chain["valid"] is True
    assert chain["count"] >= 4
