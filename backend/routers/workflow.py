import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

WORKERS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "workers.json")

_WORKER_SKELETON = {
    "worker_id": "worker-001",
    "name": "Supplier Payment Inquiries",
    "description": "Automatically handles supplier questions about payment status, invoice approvals, and remittance details.",
    "status": "active",
    "created_at": "2024-03-20T10:00:00Z",
    "workflow_name": "Supplier Payment Inquiry Handling",
    "gaps_identified": [],
    "workflow_steps": [],
    "participants": [],
    "policies": [],
    "templates": [],
}


def _load_workers():
    with open(WORKERS_PATH) as f:
        return json.load(f)


def _save_workers(workers):
    with open(WORKERS_PATH, "w") as f:
        json.dump(workers, f, indent=2)


def _upsert_worker(workers: list, worker_id: str) -> tuple[list, dict]:
    """Return (workers_list, worker_dict), creating the worker if missing."""
    for w in workers:
        if w["worker_id"] == worker_id:
            return workers, w
    new_worker = dict(_WORKER_SKELETON)
    new_worker["worker_id"] = worker_id
    workers.append(new_worker)
    return workers, new_worker


class SaveWorkflowRequest(BaseModel):
    worker_id: str
    workflow_name: str
    steps: list
    gaps_identified: list = []


class SaveParticipantsRequest(BaseModel):
    worker_id: str
    participants: list


class SavePoliciesRequest(BaseModel):
    worker_id: str
    policies: list


class SaveTemplatesRequest(BaseModel):
    worker_id: str
    templates: list


@router.get("/workers")
def get_workers():
    return _load_workers()


@router.post("/save-workflow")
def save_workflow(req: SaveWorkflowRequest):
    try:
        workers = _load_workers()
        workers, w = _upsert_worker(workers, req.worker_id)
        w["workflow_steps"] = req.steps
        w["workflow_name"] = req.workflow_name
        w["gaps_identified"] = req.gaps_identified
        _save_workers(workers)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-participants")
def save_participants(req: SaveParticipantsRequest):
    try:
        workers = _load_workers()
        workers, w = _upsert_worker(workers, req.worker_id)
        w["participants"] = req.participants
        _save_workers(workers)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-policies")
def save_policies(req: SavePoliciesRequest):
    try:
        workers = _load_workers()
        workers, w = _upsert_worker(workers, req.worker_id)
        w["policies"] = req.policies
        _save_workers(workers)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-templates")
def save_templates(req: SaveTemplatesRequest):
    try:
        workers = _load_workers()
        workers, w = _upsert_worker(workers, req.worker_id)
        w["templates"] = req.templates
        _save_workers(workers)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
