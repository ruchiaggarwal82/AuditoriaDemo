import json
import os
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from fastapi import APIRouter, Query

router = APIRouter()

AUDIT_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "audit_log.json")
WORKERS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "workers.json")


def _load_log():
    try:
        with open(AUDIT_LOG_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _load_workers():
    try:
        with open(WORKERS_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


@router.get("/metrics")
def get_metrics(worker_id: str = Query("worker-001"), period_days: int = Query(7, ge=1, le=90)):
    log = _load_log()

    # Filter to period
    cutoff = datetime.now(timezone.utc) - timedelta(days=period_days)
    entries = []
    for e in log:
        ts = e.get("timestamp", "")
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            if dt >= cutoff:
                entries.append(e)
        except Exception:
            pass

    total = len(entries)
    autonomous = [e for e in entries if e.get("outcome") == "AUTONOMOUS"]
    escalated = [e for e in entries if e.get("outcome") == "ESCALATED"]

    # Response quality (feedback on autonomous emails)
    auto_with_feedback = [e for e in autonomous if e.get("feedback")]
    auto_positive = [e for e in auto_with_feedback if e.get("feedback") == "positive"]
    auto_negative = [e for e in auto_with_feedback if e.get("feedback") == "negative"]

    # Negative feedback reason breakdown
    reason_counts = defaultdict(int)
    for e in auto_negative:
        note = e.get("feedback_note") or "Other"
        reason_counts[note] += 1

    # Escalation quality (feedback on escalated emails)
    esc_with_feedback = [e for e in escalated if e.get("escalation_feedback")]
    esc_justified = [e for e in esc_with_feedback if e.get("escalation_feedback") == "justified"]
    esc_should_auto = [e for e in esc_with_feedback if e.get("escalation_feedback") == "should_have_automated"]

    # Escalation reason breakdown
    esc_reason_counts = defaultdict(int)
    for e in escalated:
        reason = e.get("escalation_reason") or "Unknown"
        esc_reason_counts[reason] += 1

    # Intent distribution
    intent_counts = defaultdict(int)
    for e in entries:
        intent = e.get("intent_classified") or "UNKNOWN"
        intent_counts[intent] += 1

    # Daily volume — build last N days
    daily_map = defaultdict(lambda: {"total": 0, "autonomous": 0, "escalated": 0})
    for e in entries:
        ts = e.get("timestamp", "")
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            day = dt.strftime("%Y-%m-%d")
            daily_map[day]["total"] += 1
            if e.get("outcome") == "AUTONOMOUS":
                daily_map[day]["autonomous"] += 1
            else:
                daily_map[day]["escalated"] += 1
        except Exception:
            pass

    # Fill all days in period (even zeros)
    daily_volume = []
    for i in range(period_days - 1, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        d = daily_map[day]
        daily_volume.append({"date": day, "total": d["total"], "autonomous": d["autonomous"], "escalated": d["escalated"]})

    # Averages
    avg_confidence = round(sum(e.get("confidence", 0) for e in entries) / total, 3) if total > 0 else 0
    avg_processing_ms = round(sum(e.get("processing_time_ms", 0) for e in entries) / total) if total > 0 else 0

    # Quality rates (only among those with feedback)
    response_quality_rate = round(len(auto_positive) / len(auto_with_feedback) * 100, 1) if auto_with_feedback else None
    escalation_quality_rate = round(len(esc_justified) / len(esc_with_feedback) * 100, 1) if esc_with_feedback else None

    return {
        "worker_id": worker_id,
        "period_days": period_days,
        "volume": {
            "total": total,
            "autonomous": len(autonomous),
            "escalated": len(escalated),
            "autonomous_rate": round(len(autonomous) / total * 100, 1) if total > 0 else 0,
        },
        "response_quality": {
            "positive": len(auto_positive),
            "negative": len(auto_negative),
            "no_feedback": len(autonomous) - len(auto_with_feedback),
            "quality_rate": response_quality_rate,
            "negative_reasons": dict(reason_counts),
        },
        "escalation_quality": {
            "justified": len(esc_justified),
            "should_have_automated": len(esc_should_auto),
            "no_feedback": len(escalated) - len(esc_with_feedback),
            "quality_rate": escalation_quality_rate,
            "by_reason": dict(esc_reason_counts),
        },
        "intent_distribution": dict(intent_counts),
        "avg_confidence": avg_confidence,
        "avg_processing_ms": avg_processing_ms,
        "daily_volume": daily_volume,
    }
