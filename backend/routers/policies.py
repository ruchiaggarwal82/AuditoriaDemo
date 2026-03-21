import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

WORKERS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "workers.json")


def _load_workers():
    with open(WORKERS_PATH) as f:
        return json.load(f)


def _save_workers(workers):
    with open(WORKERS_PATH, "w") as f:
        json.dump(workers, f, indent=2)


class SavePoliciesRequest(BaseModel):
    worker_id: str
    policies: list


class SaveTemplatesRequest(BaseModel):
    worker_id: str
    templates: list


@router.get("/worker/{worker_id}")
def get_policies(worker_id: str):
    workers = _load_workers()
    for w in workers:
        if w["worker_id"] == worker_id:
            return {"policies": w.get("policies", [])}
    raise HTTPException(status_code=404, detail="Worker not found")


@router.post("/save")
def save_policies(req: SavePoliciesRequest):
    try:
        workers = _load_workers()
        for w in workers:
            if w["worker_id"] == req.worker_id:
                w["policies"] = req.policies
                break
        _save_workers(workers)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-templates")
def save_templates(req: SaveTemplatesRequest):
    try:
        workers = _load_workers()
        for w in workers:
            if w["worker_id"] == req.worker_id:
                w["templates"] = req.templates
                break
        _save_workers(workers)
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
