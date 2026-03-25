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


class SaveFieldMapRequest(BaseModel):
    worker_id: str
    field_map: list


@router.get("/workers")
def get_workers():
    return _load_workers()


# These are the policies that the agent always enforces in Step 4 (Policy Match),
# regardless of whether the user has explicitly saved them via the Setup wizard.
_DEFAULT_POLICIES = [
    {"policy_id": "POL-001", "policy_name": "High-value invoice escalation",
     "trigger": "Always notify the AP Manager when invoice amount exceeds $25,000, even if auto-response is possible"},
    {"policy_id": "POL-002", "policy_name": "On-hold invoice escalation",
     "trigger": "Never auto-respond to invoices with status 'on_hold' — always escalate to AP Manager for review"},
    {"policy_id": "POL-003", "policy_name": "Low confidence escalation",
     "trigger": "Escalate to AP Manager if classification confidence is below 85%"},
]


@router.get("/active-policies/{worker_id}")
def get_active_policies(worker_id: str):
    """Return the worker's saved policies, or the hardcoded defaults that the system enforces."""
    workers = _load_workers()
    for w in workers:
        if w["worker_id"] == worker_id:
            if w.get("policies"):
                return {"policies": w["policies"], "source": "configured"}
    return {"policies": _DEFAULT_POLICIES, "source": "defaults"}


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


@router.get("/field-map/{worker_id}")
def get_field_map(worker_id: str):
    workers = _load_workers()
    for w in workers:
        if w["worker_id"] == worker_id:
            return {"field_map": w.get("field_map", []), "confirmed": bool(w.get("field_map"))}
    return {"field_map": [], "confirmed": False}


@router.post("/save-field-map")
def save_field_map(req: SaveFieldMapRequest):
    try:
        workers = _load_workers()
        workers, w = _upsert_worker(workers, req.worker_id)
        w["field_map"] = req.field_map
        _save_workers(workers)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
