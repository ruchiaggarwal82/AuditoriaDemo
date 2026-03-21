import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from services import claude_service, gmail_service, slack_service

router = APIRouter()

# Module-level polling state
_polling_active = False
_last_checked: str | None = None
_emails_processed_today = 0
_recent_emails: list[dict] = []
_poll_task: asyncio.Task | None = None

AUDIT_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "audit_log.json")
ERP_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "erp_data.json")


def _load_erp_data() -> list[dict]:
    with open(ERP_DATA_PATH) as f:
        return json.load(f)["invoices"]


def _lookup_erp(invoice_reference: str | None) -> dict | None:
    if not invoice_reference:
        return None
    invoices = _load_erp_data()
    ref = invoice_reference.upper()
    for inv in invoices:
        inv_id = inv["invoice_id"].upper()
        po = inv.get("po_number", "").upper()
        if ref in inv_id or inv_id in ref or (po and (ref in po or po in ref)):
            return inv
    return None


def _append_audit(entry: dict):
    try:
        with open(AUDIT_LOG_PATH) as f:
            log = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        log = []
    log.append(entry)
    with open(AUDIT_LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)


async def poll_and_process():
    global _polling_active, _last_checked, _emails_processed_today, _recent_emails

    while _polling_active:
        try:
            _last_checked = datetime.now(timezone.utc).isoformat()
            emails = await gmail_service.get_unread_emails()

            for email in emails:
                start_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
                entry_id = f"audit-{uuid.uuid4().hex[:8]}"
                outcome = "ESCALATED"
                response_sent = False
                escalated = False
                escalation_reason = None
                invoice_found = False
                invoice_id = None
                confidence = 0.0

                try:
                    classification = claude_service.classify_intent(
                        email["subject"], email["body"]
                    )
                    confidence = classification.get("confidence", 0.0)
                    invoice_ref = classification.get("invoice_reference")
                    erp_data = _lookup_erp(invoice_ref)

                    if erp_data:
                        invoice_found = True
                        invoice_id = erp_data["invoice_id"]

                    requires_human = erp_data and erp_data.get("status") in ("on_hold",)
                    high_confidence = confidence >= 0.85

                    if high_confidence and erp_data and not requires_human:
                        # Autonomous path
                        response = claude_service.generate_response(
                            email["body"], erp_data, []
                        )
                        if not response.get("requires_human_review"):
                            await gmail_service.send_reply(
                                thread_id=email["thread_id"],
                                to=email["from"],
                                subject=response["subject"],
                                body=response["body"],
                            )
                            outcome = "AUTONOMOUS"
                            response_sent = True
                        else:
                            escalation_reason = response.get("review_reason", "Human review required")
                            try:
                                await slack_service.send_escalation(email, escalation_reason, erp_data)
                                escalated = True
                            except Exception as slack_err:
                                print(f"Slack error: {slack_err}")
                    else:
                        if requires_human:
                            escalation_reason = "Invoice is on hold — requires AP team review"
                        elif not erp_data:
                            escalation_reason = "Invoice not found in ERP system"
                        else:
                            escalation_reason = f"Low confidence ({confidence:.0%}) — human review requested"
                        try:
                            await slack_service.send_escalation(email, escalation_reason, erp_data)
                            escalated = True
                        except Exception as slack_err:
                            print(f"Slack error: {slack_err}")

                    await gmail_service.mark_as_read(email["id"])
                    _emails_processed_today += 1

                except Exception as proc_err:
                    print(f"Processing error for email {email['id']}: {proc_err}")
                    escalation_reason = f"Processing error: {str(proc_err)}"

                end_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
                audit_entry = {
                    "entry_id": entry_id,
                    "timestamp": _last_checked,
                    "email_from": email["from"],
                    "email_subject": email["subject"],
                    "intent_classified": classification.get("intent", "UNKNOWN") if "classification" in dir() else "UNKNOWN",
                    "confidence": confidence,
                    "invoice_found": invoice_found,
                    "invoice_id": invoice_id,
                    "outcome": outcome,
                    "response_sent": response_sent,
                    "escalated_to_slack": escalated,
                    "escalation_reason": escalation_reason,
                    "processing_time_ms": end_ms - start_ms,
                    "feedback": None,
                    "feedback_note": None,
                }
                _append_audit(audit_entry)

                # Keep recent emails list (most recent first, max 10)
                recent_entry = {
                    "entry_id": entry_id,
                    "from": email["from"],
                    "subject": email["subject"],
                    "timestamp": email["timestamp"],
                    "intent": audit_entry["intent_classified"],
                    "outcome": outcome,
                    "confidence": confidence,
                    "invoice_id": invoice_id,
                    "escalation_reason": escalation_reason,
                }
                _recent_emails.insert(0, recent_entry)
                _recent_emails = _recent_emails[:10]

        except Exception as outer_err:
            print(f"Poll loop error: {outer_err}")

        await asyncio.sleep(30)


@router.get("/status")
def get_status():
    return {
        "polling_active": _polling_active,
        "last_checked": _last_checked,
        "emails_processed_today": _emails_processed_today,
    }


@router.post("/start-polling")
async def start_polling():
    global _polling_active, _poll_task
    if _polling_active:
        return {"status": "already_polling"}
    _polling_active = True
    _poll_task = asyncio.create_task(poll_and_process())
    return {"status": "polling_started"}


@router.post("/stop-polling")
async def stop_polling():
    global _polling_active, _poll_task
    _polling_active = False
    if _poll_task and not _poll_task.done():
        _poll_task.cancel()
    return {"status": "polling_stopped"}


@router.get("/recent")
def get_recent():
    return _recent_emails
