import json
import os
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

AUDIT_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "audit_log.json")


def _load_log():
    try:
        with open(AUDIT_LOG_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _save_log(log):
    with open(AUDIT_LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)


class FeedbackRequest(BaseModel):
    entry_id: str
    feedback: str  # "positive" or "negative"
    note: str = ""


class EscalationFeedbackRequest(BaseModel):
    entry_id: str
    escalation_feedback: str  # "justified" or "should_have_automated"
    escalation_feedback_note: str = ""


@router.get("/log")
def get_log(limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0)):
    log = _load_log()
    # Return most recent first
    log_sorted = sorted(log, key=lambda e: e.get("timestamp", ""), reverse=True)
    return log_sorted[offset: offset + limit]


@router.post("/feedback")
def record_feedback(req: FeedbackRequest):
    if req.feedback not in ("positive", "negative"):
        raise HTTPException(status_code=400, detail="feedback must be 'positive' or 'negative'")

    log = _load_log()
    for entry in log:
        if entry["entry_id"] == req.entry_id:
            entry["feedback"] = req.feedback
            entry["feedback_note"] = req.note
            _save_log(log)
            return {"status": "feedback_recorded"}

    raise HTTPException(status_code=404, detail="Audit entry not found")


@router.post("/escalation-feedback")
def record_escalation_feedback(req: EscalationFeedbackRequest):
    if req.escalation_feedback not in ("justified", "should_have_automated"):
        raise HTTPException(status_code=400, detail="escalation_feedback must be 'justified' or 'should_have_automated'")

    log = _load_log()
    for entry in log:
        if entry["entry_id"] == req.entry_id:
            entry["escalation_feedback"] = req.escalation_feedback
            entry["escalation_feedback_note"] = req.escalation_feedback_note
            _save_log(log)
            return {"status": "escalation_feedback_recorded"}

    raise HTTPException(status_code=404, detail="Audit entry not found")
