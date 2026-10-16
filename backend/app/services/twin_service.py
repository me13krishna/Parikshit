import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import aiosqlite

from app.core.logging import logger
from app.core.errors import AppError
from app.db.database import get_db_path
from app.agents.llm_gateway import LLMGateway
from app.services.ledger_service import LedgerService

class DigitalTwinService:
    @classmethod
    async def get_dependency_graph(cls, project_id: str) -> Dict[str, Any]:
        """
        Builds the Software Digital Twin dependency graph:
        Nodes: files, modules, key classes/functions
        Edges: imports and symbol relations
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            rev = None
            if project_id and project_id != "default":
                cursor = await db.execute(
                    "SELECT id FROM repo_revisions WHERE project_id = ? ORDER BY indexed_at DESC LIMIT 1;",
                    (project_id,)
                )
                rev = await cursor.fetchone()
            if not rev:
                cursor = await db.execute(
                    "SELECT id FROM repo_revisions ORDER BY indexed_at DESC LIMIT 1;"
                )
                rev = await cursor.fetchone()
            if not rev:
                return {
                    "project_id": project_id or "default",
                    "revision_id": "",
                    "nodes": [],
                    "edges": [],
                    "total_nodes": 0,
                    "total_edges": 0,
                }

            revision_id = rev["id"]

            # Pull files
            files_cursor = await db.execute(
                "SELECT id, path, language, kind, importance_score FROM files WHERE revision_id = ?;",
                (revision_id,)
            )
            files = [dict(r) for r in await files_cursor.fetchall()]

            # Pull import edges
            edges_cursor = await db.execute(
                "SELECT * FROM edges WHERE revision_id = ?;",
                (revision_id,)
            )
            edges_rows = await edges_cursor.fetchall()

        nodes = []
        file_path_to_node = {}

        for f in files:
            node_id = f["id"]
            file_path_to_node[f["path"]] = node_id
            nodes.append({
                "id": node_id,
                "label": Path(f["path"]).name,
                "path": f["path"],
                "kind": f["kind"],
                "language": f["language"],
                "importance": f["importance_score"]
            })

        graph_edges = []
        for e in edges_rows:
            evidence = json.loads(e["evidence"]) if e["evidence"] else {}
            from_file = evidence.get("from")
            imported_mod = evidence.get("imported")

            # Try to resolve target file in project (polyglot: Python, JS/TS, etc.)
            target_node = None
            if imported_mod:
                clean_mod = imported_mod.strip().strip("'\"").replace(".", "/").lstrip("./")
                mod_stem = Path(clean_mod).stem
                for p, nid in file_path_to_node.items():
                    p_stem = Path(p).stem
                    if mod_stem == p_stem or clean_mod in p or p.endswith(f"{clean_mod}.py") or p.endswith(f"{clean_mod}.ts") or p.endswith(f"{clean_mod}.js"):
                        target_node = nid
                        break

            from_node = file_path_to_node.get(from_file)
            if from_node and target_node and from_node != target_node:
                graph_edges.append({
                    "id": f"edge_{e['id']}",
                    "source": from_node,
                    "target": target_node,
                    "type": e["edge_type"],
                    "label": f"imports {imported_mod}"
                })

        return {
            "project_id": project_id,
            "revision_id": revision_id,
            "nodes": nodes,
            "edges": graph_edges,
            "total_nodes": len(nodes),
            "total_edges": len(graph_edges)
        }

    @classmethod
    async def predict_impact(cls, task_id: str) -> Dict[str, Any]:
        """
        Uses the Digital Twin graph and task request to predict affected files
        and dependencies before code generation begins.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM tasks WHERE id = ?;", (task_id,))
            task = await cursor.fetchone()
            if not task:
                raise AppError(f"Task {task_id} not found", code="TASK_NOT_FOUND")

            project_id = task["project_id"]
            revision_id = task["revision_id"]

        graph = await cls.get_dependency_graph(project_id)
        file_paths = [n["path"] for n in graph["nodes"]]

        prompt = f"""
Task Natural Language Request: "{task['request_text']}"
Available Repository Files:
{json.dumps(file_paths, indent=2)}

Predict which files are directly or indirectly impacted by this change request.
Produce JSON:
{{
  "predicted_files": ["list", "of", "file_paths"],
  "rationale": "Explanation based on dependency graph flow",
  "risk_assessment": "low|medium|high"
}}
"""
        messages = [
            {"role": "system", "content": "You are the Parikshit Digital Twin Impact Predictor."},
            {"role": "user", "content": prompt}
        ]

        llm_res = await LLMGateway.generate_chat(messages, temperature=0.1)
        raw = llm_res["content"].strip()

        try:
            clean = raw
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0].strip()
            prediction = json.loads(clean)
        except Exception:
            source_files = [f for f in file_paths if f.endswith(".py") and not f.startswith("test_")]
            test_files = [f for f in file_paths if f.startswith("test_") or "test" in f]
            predicted = (source_files[:1] + test_files[:1]) if source_files else file_paths[:2]
            prediction = {
                "predicted_files": predicted,
                "rationale": "Direct module modification and corresponding test coverage file.",
                "risk_assessment": "low"
            }

        # Append to Ledger
        await LedgerService.append_entry(
            event_type="impact_predicted",
            project_id=project_id,
            payload={
                "task_id": task_id,
                "predicted_files": prediction["predicted_files"],
                "risk_assessment": prediction.get("risk_assessment", "low")
            },
            related_ids={"task_id": task_id}
        )

        return {
            "task_id": task_id,
            "prediction": prediction
        }

    @classmethod
    async def compare_predicted_vs_actual(cls, task_id: str) -> Dict[str, Any]:
        """
        Compares predicted impact with actual files modified in the workspace patch.
        Computes precision, recall, and false positives/negatives.
        """
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM tasks WHERE id = ?;", (task_id,))
            task = await cursor.fetchone()
            if not task:
                raise AppError(f"Task {task_id} not found", code="TASK_NOT_FOUND")

            wsp_cursor = await db.execute(
                "SELECT * FROM workspaces WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;",
                (task_id,)
            )
            wsp = await wsp_cursor.fetchone()
            actual_files = []
            if wsp:
                patch_cursor = await db.execute(
                    "SELECT files_changed FROM patches WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1;",
                    (wsp["id"],)
                )
                patch = await patch_cursor.fetchone()
                if patch and patch["files_changed"]:
                    actual_files = json.loads(patch["files_changed"])

        pred_res = await cls.predict_impact(task_id)
        predicted_files = pred_res["prediction"].get("predicted_files", [])

        pred_set = set(p.replace("\\", "/") for p in predicted_files)
        actual_set = set(a.replace("\\", "/") for a in actual_files)

        overlap = pred_set.intersection(actual_set)
        missed = actual_set.difference(pred_set)
        unneeded = pred_set.difference(actual_set)

        precision = len(overlap) / len(pred_set) if pred_set else 1.0
        recall = len(overlap) / len(actual_set) if actual_set else 1.0

        return {
            "task_id": task_id,
            "predicted_files": list(pred_set),
            "actual_files": list(actual_set),
            "correctly_predicted": list(overlap),
            "missed_impacts": list(missed),
            "unmodified_predictions": list(unneeded),
            "metrics": {
                "precision": round(precision, 2),
                "recall": round(recall, 2)
            }
        }
