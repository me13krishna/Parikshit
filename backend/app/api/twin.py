from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pathlib import Path
from pydantic import BaseModel
import aiosqlite

from app.core.errors import success_response, error_response
from app.db.database import get_db_path
from app.services.twin_service import DigitalTwinService

router = APIRouter(tags=["Software Digital Twin"])

class SimulateChangeRequest(BaseModel):
    revision_id: Optional[str] = None
    project_id: Optional[str] = None
    changed_file: str

@router.get("/twin/graph")
@router.get("/projects/{project_id}/graph")
async def get_dependency_graph(
    project_id: Optional[str] = None,
    revision_id: Optional[str] = Query(None)
):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        rev = None
        if revision_id:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions WHERE id = ?;", (revision_id,))
            rev = await cursor.fetchone()
        if not rev and project_id:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;", (project_id,))
            rev = await cursor.fetchone()
        if not rev:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;")
            rev = await cursor.fetchone()
        
        target_project_id = rev["project_id"] if rev else (project_id or "default")

    graph = await DigitalTwinService.get_dependency_graph(target_project_id)
    return success_response(graph)

@router.post("/twin/simulate-change")
async def simulate_change(req: SimulateChangeRequest):
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        rev = None
        if req.revision_id:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions WHERE id = ?;", (req.revision_id,))
            rev = await cursor.fetchone()
        if not rev:
            cursor = await db.execute("SELECT id, project_id FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;")
            rev = await cursor.fetchone()
        
        target_pid = rev["project_id"] if rev else "default"

    graph = await DigitalTwinService.get_dependency_graph(target_pid)
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    
    node_by_id = {n["id"]: n for n in nodes}
    id_by_path = {n["path"]: n["id"] for n in nodes}
    id_by_label = {n.get("label", ""): n["id"] for n in nodes}

    # Find the target node ID
    target_node_id = id_by_path.get(req.changed_file) or id_by_label.get(req.changed_file)
    if not target_node_id:
        for p, nid in id_by_path.items():
            if req.changed_file in p or p in req.changed_file:
                target_node_id = nid
                break

    affected_nodes = set()
    if target_node_id:
        for e in edges:
            src = e.get("source") or e.get("from")
            tgt = e.get("target") or e.get("to")
            if src == target_node_id and tgt:
                affected_nodes.add(tgt)
            elif tgt == target_node_id and src:
                affected_nodes.add(src)

    affected_list = [node_by_id[nid]["path"] for nid in affected_nodes if nid in node_by_id and node_by_id[nid]["path"] != req.changed_file]
    if not affected_list:
        affected_list = [n.get("path", n.get("label", "")) for n in nodes[:3] if n.get("path") != req.changed_file]

    # Dynamic test file matching
    target_stem = Path(req.changed_file).stem
    matched_tests = [
        n["path"] for n in nodes
        if n.get("kind") == "test" or n["path"].startswith("tests/") or f"test_{target_stem}" in n["path"]
    ]
    tests = matched_tests if matched_tests else [f"test_{target_stem}.py"]
    blast_radius = min(100, int((len(affected_list) / max(1, len(nodes))) * 100) + 15)
    risk_level = "high" if blast_radius > 60 else "medium" if blast_radius > 25 else "low"

    return success_response({
        "changed_file": req.changed_file,
        "affected_files": affected_list,
        "blast_radius_score": blast_radius,
        "risk_level": risk_level,
        "affected_tests": tests
    })

@router.post("/tasks/{task_id}/predict-impact")
async def predict_task_impact(task_id: str):
    result = await DigitalTwinService.predict_impact(task_id)
    return success_response(result)

@router.get("/tasks/{task_id}/impact")
async def get_task_impact_comparison(task_id: str):
    result = await DigitalTwinService.compare_predicted_vs_actual(task_id)
    return success_response(result)
