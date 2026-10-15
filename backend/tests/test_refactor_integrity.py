import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import init_db
from app.core.config import settings
from app.agents.llm_gateway import LLMGateway
from app.services.self_healing_service import SelfHealingService
from app.services.ingestion_service import IngestionService

@pytest.mark.asyncio
async def test_llm_gateway_hf_support():
    original_provider = settings.LLM_PROVIDER
    try:
        settings.LLM_PROVIDER = "huggingface"
        settings.HUGGINGFACE_BASE_URL = "http://localhost:11434/v1"
        assert LLMGateway.is_configured() is True
    finally:
        settings.LLM_PROVIDER = original_provider

@pytest.mark.asyncio
async def test_projects_unified_ingest_and_twin_graph():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Ingest via unified projects endpoint
        demo_dir = Path("data/demo/calculator_app").resolve()
        assert demo_dir.exists()

        resp = await client.post(
            "/api/v1/projects",
            json={
                "source_type": "local",
                "source_uri": str(demo_dir),
                "name": "Refactor Verification Suite"
            }
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert "default_revision_id" in data
        assert "project_id" in data
        project_id = data["project_id"]
        revision_id = data["default_revision_id"]

        # Verify twin graph has nodes and edges
        twin_resp = await client.get(f"/api/v1/twin/graph?revision_id={revision_id}")
        assert twin_resp.status_code == 200
        twin_data = twin_resp.json()["data"]
        assert "nodes" in twin_data
        assert "edges" in twin_data
        assert len(twin_data["nodes"]) >= 1

        # Simulate change on twin
        sim_resp = await client.post(
            "/api/v1/twin/simulate-change",
            json={
                "revision_id": revision_id,
                "changed_file": "calculator.py"
            }
        )
        assert sim_resp.status_code == 200
        sim_data = sim_resp.json()["data"]
        assert sim_data["changed_file"] == "calculator.py"
        assert "blast_radius_score" in sim_data
        assert "affected_files" in sim_data
        assert "affected_tests" in sim_data

@pytest.mark.asyncio
async def test_treesitter_parser_multilang():
    from app.services.indexer_service import IndexerService

    # 1. Test Python extraction
    py_code = """
import os
from math import sqrt

def compute_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    \"\"\"Compute euclidean distance\"\"\"
    return sqrt((x2 - x1)**2 + (y2 - y1)**2)

class GeometryEngine:
    def area(self):
        return 0.0
"""
    py_chunks, py_syms, py_imports = IndexerService._extract_code_elements("f1", "geo.py", py_code, "python")
    sym_names = [s["name"] for s in py_syms]
    assert "compute_distance" in sym_names
    assert "GeometryEngine" in sym_names
    assert any("math" in imp for imp in py_imports)
    assert len(py_chunks) >= 2

    # 2. Test JavaScript / TypeScript extraction
    js_code = """
import { useState } from 'react';
import axios from 'axios';

export function UserList() {
    return null;
}

export const fetchUsers = async () => {
    return [];
};

export class SessionService {
    logout() {
        return true;
    }
}
"""
    js_chunks, js_syms, js_imports = IndexerService._extract_code_elements("f2", "App.tsx", js_code, "typescript")
    js_names = [s["name"] for s in js_syms]
    assert "UserList" in js_names
    assert "fetchUsers" in js_names
    assert "SessionService" in js_names
    assert any("react" in imp for imp in js_imports)
    assert len(js_chunks) >= 3

@pytest.mark.asyncio
async def test_semantic_embeddings_and_retrieval():
    from app.agents.llm_gateway import LLMGateway
    from app.services.retrieval_service import RetrievalService

    # 1. Test embed_text creates normalized dense vectors
    sample_texts = ["def calculate_tax(income):", "import fastapi from FastAPI", "database connection pool"]
    vectors = await LLMGateway.embed_text(sample_texts)
    assert len(vectors) == len(sample_texts)
    assert len(vectors[0]) > 0
    # Vectors should be normalized
    norm = sum(x * x for x in vectors[0]) ** 0.5
    assert abs(norm - 1.0) < 1e-4

    # 2. Test cosine similarity
    sim_self = RetrievalService._cosine_similarity(vectors[0], vectors[0])
    assert abs(sim_self - 1.0) < 1e-4
    sim_diff = RetrievalService._cosine_similarity(vectors[0], vectors[1])
    assert 0.0 <= sim_diff <= 1.0
