from fastapi import APIRouter, HTTPException
from typing import Optional
from app.core.errors import success_response, error_response
from app.services.twin_service import DigitalTwinService

router = APIRouter(tags=["Software Digital Twin"])

@router.get("/projects/{project_id}/graph")
async def get_dependency_graph(project_id: str):
    graph = await DigitalTwinService.get_dependency_graph(project_id)
    return success_response(graph)

@router.post("/tasks/{task_id}/predict-impact")
async def predict_task_impact(task_id: str):
    result = await DigitalTwinService.predict_impact(task_id)
    return success_response(result)

@router.get("/tasks/{task_id}/impact")
async def get_task_impact_comparison(task_id: str):
    result = await DigitalTwinService.compare_predicted_vs_actual(task_id)
    return success_response(result)
