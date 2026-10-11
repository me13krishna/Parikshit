import pytest
from httpx import AsyncClient, ASGITransport
from pathlib import Path
from app.main import app
from app.db.database import init_db
from app.services.ingestion_service import IngestionService

@pytest.mark.asyncio
async def test_full_api_contract_endpoints():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. System Endpoints
        health_resp = await client.get("/api/v1/health")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert health_data["ok"] is True
        assert health_data["data"]["status"] in ["ok", "degraded"]

        metrics_resp = await client.get("/api/v1/metrics")
        assert metrics_resp.status_code == 200
        metrics_data = metrics_resp.json()
        assert metrics_data["ok"] is True
        assert "projects_total" in metrics_data["data"]["metrics"]

        # 2. Ingest demo project
        demo_dir = Path("data/demo/calculator_app").resolve()
        assert demo_dir.exists()
        ingest_res = await IngestionService.ingest_repository(
            source_type="local",
            source_uri=str(demo_dir),
            name="API Contract Verification Project"
        )
        project_id = ingest_res["project_id"]

        # 3. Projects & Revisions Endpoints
        p_list = await client.get("/api/v1/projects")
        assert p_list.status_code == 200
        assert p_list.json()["ok"] is True

        p_get = await client.get(f"/api/v1/projects/{project_id}")
        assert p_get.status_code == 200
        assert p_get.json()["ok"] is True

        p_revs = await client.get(f"/api/v1/projects/{project_id}/revisions")
        assert p_revs.status_code == 200
        assert p_revs.json()["ok"] is True
        assert p_revs.json()["data"]["count"] >= 1

        # 4. Mentor Endpoints
        conv_resp = await client.get(f"/api/v1/projects/{project_id}/conversations")
        assert conv_resp.status_code == 200
        assert conv_resp.json()["ok"] is True

        starter_resp = await client.get(f"/api/v1/projects/{project_id}/starter-tasks")
        assert starter_resp.status_code == 200
        assert starter_resp.json()["ok"] is True
        assert len(starter_resp.json()["data"]["starter_tasks"]) >= 1

        sym_resp = await client.get(f"/api/v1/projects/{project_id}/symbols")
        assert sym_resp.status_code == 200
        assert sym_resp.json()["ok"] is True

        # 5. Project Ledger Endpoints
        proj_ledger = await client.get(f"/api/v1/projects/{project_id}/ledger")
        assert proj_ledger.status_code == 200
        assert proj_ledger.json()["ok"] is True
        assert len(proj_ledger.json()["data"]["entries"]) >= 1

        proj_export = await client.get(f"/api/v1/projects/{project_id}/ledger/export")
        assert proj_export.status_code == 200
        assert proj_export.json()["ok"] is True
        assert proj_export.json()["data"]["total_entries"] >= 1

        # 6. Task & Plan Endpoints
        task_create = await client.post(
            f"/api/v1/projects/{project_id}/tasks",
            json={"request_text": "Add modulus operator"}
        )
        assert task_create.status_code == 201
        task_id = task_create.json()["data"]["task_id"]

        plan_resp = await client.post(f"/api/v1/tasks/{task_id}/plan")
        assert plan_resp.status_code == 200
        assert plan_resp.json()["ok"] is True

        approve_plan = await client.post(f"/api/v1/tasks/{task_id}/approve-plan")
        assert approve_plan.status_code == 200
        assert approve_plan.json()["ok"] is True

        # 7. Job Endpoint (Not Found Envelope Check)
        job_resp = await client.get("/api/v1/jobs/job_nonexistent")
        assert job_resp.status_code == 404
        assert job_resp.json()["ok"] is False
        assert job_resp.json()["error"]["code"] == "JOB_NOT_FOUND"

        # 8. Repair Attempt Endpoint (Not Found Envelope Check)
        repair_resp = await client.get("/api/v1/repair-attempts/att_nonexistent")
        assert repair_resp.status_code == 404
        assert repair_resp.json()["ok"] is False
        assert repair_resp.json()["error"]["code"] == "ATTEMPT_NOT_FOUND"
