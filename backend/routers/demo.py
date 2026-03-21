import json
import os
import shutil
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SEEDS_DIR = os.path.join(DATA_DIR, "seeds")

FILES = {
    "workers": ("workers.json", "workers_seed.json"),
    "audit_log": ("audit_log.json", "audit_log_seed.json"),
    "recent_emails": ("recent_emails.json", "recent_emails_seed.json"),
}

FRESH_STATE = {
    "workers": [],
    "audit_log": [],
    "recent_emails": [],
}


@router.post("/reset")
def reset_demo(mode: str = "fresh"):
    """
    Reset demo data.
    mode=fresh  → clears everything so setup wizard starts from step 1
    mode=restore → restores the 30-entry seed data for dashboard/feedback demo
    """
    if mode not in ("fresh", "restore"):
        raise HTTPException(status_code=400, detail="mode must be 'fresh' or 'restore'")

    if mode == "fresh":
        for key, (filename, _) in FILES.items():
            path = os.path.join(DATA_DIR, filename)
            with open(path, "w") as f:
                json.dump(FRESH_STATE[key], f, indent=2)
        return {"status": "reset", "mode": "fresh", "message": "All demo data cleared. Setup wizard will start from step 1."}

    else:  # restore
        for key, (filename, seed_filename) in FILES.items():
            src = os.path.join(SEEDS_DIR, seed_filename)
            dst = os.path.join(DATA_DIR, filename)
            if os.path.exists(src):
                shutil.copy2(src, dst)
        return {"status": "reset", "mode": "restore", "message": "Seed data restored. Dashboard and audit trail are populated."}


@router.get("/status")
def demo_status():
    """Return current state of demo data for the UI to show appropriate reset options."""
    workers_path = os.path.join(DATA_DIR, "workers.json")
    audit_path = os.path.join(DATA_DIR, "audit_log.json")

    try:
        with open(workers_path) as f:
            workers = json.load(f)
        worker_configured = len(workers) > 0 and len(workers[0].get("workflow_steps", [])) > 0
    except Exception:
        worker_configured = False

    try:
        with open(audit_path) as f:
            audit = json.load(f)
        audit_count = len(audit)
    except Exception:
        audit_count = 0

    return {
        "worker_configured": worker_configured,
        "audit_entries": audit_count,
    }
