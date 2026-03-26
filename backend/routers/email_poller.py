import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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
RECENT_EMAILS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "recent_emails.json")


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


def clear_recent_emails():
    global _recent_emails
    _recent_emails = []


def _load_recent_emails() -> list[dict]:
    try:
        with open(RECENT_EMAILS_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _save_recent_emails():
    with open(RECENT_EMAILS_PATH, "w") as f:
        json.dump(_recent_emails, f, indent=2)


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
                erp_data = None
                is_short_pay = False
                draft_response_data = None
                reply_body = None
                reply_subject = None

                # Mark as read immediately so a processing crash never causes re-processing
                await gmail_service.mark_as_read(email["id"])

                classification = {}
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

                    intent = classification.get("intent", "UNKNOWN")
                    is_short_pay = intent == "SHORT_PAY"
                    is_invoice_approval = intent == "INVOICE_APPROVAL"
                    requires_human = erp_data and erp_data.get("status") in ("on_hold", "short_paid")
                    high_confidence = confidence >= 0.85

                    if high_confidence and erp_data and not requires_human and not is_short_pay and not is_invoice_approval:
                        # Autonomous path
                        response = claude_service.generate_response(
                            email["body"], erp_data, []
                        )
                        print(f"[email_poller] generate_response keys: {list(response.keys())}")
                        reply_subject = response.get("subject") or f"Re: {email['subject']}"
                        reply_body = response.get("body", "")
                        if not response.get("requires_human_review") and reply_body:
                            reply_subject = reply_subject  # captured for recent_entry
                            await gmail_service.send_reply(
                                thread_id=email["thread_id"],
                                to=email["from"],
                                subject=reply_subject,
                                body=reply_body,
                                message_id=email.get("message_id", ""),
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
                        # Escalation path
                        if is_short_pay:
                            escalation_reason = "Short payment dispute — AP Manager review required before responding"
                            # Generate a draft response for AP clerk to approve
                            try:
                                draft = claude_service.generate_response(
                                    email["body"], erp_data or {}, []
                                )
                                draft_response_data = {
                                    "subject": draft.get("subject") or f"Re: {email['subject']}",
                                    "body": draft.get("body", ""),
                                }
                            except Exception as draft_err:
                                print(f"[email_poller] Draft generation error: {draft_err}")
                        elif is_invoice_approval:
                            escalation_reason = "Invoice approval requires human authorization (POL-004)"
                        elif requires_human:
                            status = erp_data.get("status", "")
                            if status == "short_paid":
                                escalation_reason = "Invoice shows short payment — dispute requires AP Manager review before responding"
                            else:
                                escalation_reason = "Invoice is on hold — requires AP team review"
                        elif not erp_data:
                            escalation_reason = "Invoice not found in ERP system"
                        else:
                            escalation_reason = f"Low confidence ({confidence:.0%}) — human review requested"

                        try:
                            if is_short_pay and erp_data:
                                await slack_service.send_short_pay_escalation(
                                    email, erp_data, draft_response_data
                                )
                            else:
                                await slack_service.send_escalation(email, escalation_reason, erp_data)
                            escalated = True
                        except Exception as slack_err:
                            print(f"Slack error: {slack_err}")

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
                    "email_thread_id": email.get("thread_id", ""),
                    "email_from_addr": email["from"],
                    "email_message_id": email.get("message_id", ""),
                    "intent_classified": classification.get("intent", "UNKNOWN"),
                    "confidence": confidence,
                    "invoice_found": invoice_found,
                    "invoice_id": invoice_id,
                    "outcome": outcome,
                    "response_sent": response_sent,
                    "escalated_to_slack": escalated,
                    "escalation_reason": escalation_reason,
                    "processing_time_ms": end_ms - start_ms,
                    "draft_response": draft_response_data,
                    "approved": False,
                    "approved_at": None,
                    "feedback": None,
                    "feedback_note": None,
                }
                _append_audit(audit_entry)

                # Keep recent emails list (most recent first, max 10)
                recent_entry = {
                    "entry_id": entry_id,
                    "from": email["from"],
                    "subject": email["subject"],
                    "email_body": email.get("body", ""),
                    "timestamp": email["timestamp"],
                    "intent": audit_entry["intent_classified"],
                    "outcome": outcome,
                    "confidence": confidence,
                    "invoice_id": invoice_id,
                    "escalation_reason": escalation_reason,
                    "erp_detail": erp_data if is_short_pay else None,
                    "reply_subject": reply_subject,
                    "reply_body": reply_body,
                }
                _recent_emails.insert(0, recent_entry)
                _recent_emails = _recent_emails[:10]
                _save_recent_emails()

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
    global _recent_emails
    if not _recent_emails:
        _recent_emails = _load_recent_emails()

    # Merge feedback + approval fields from audit log
    try:
        with open(AUDIT_LOG_PATH) as f:
            audit_log = json.load(f)
        audit_by_id = {e["entry_id"]: e for e in audit_log}
        enriched = []
        for email in _recent_emails:
            audit = audit_by_id.get(email["entry_id"], {})
            enriched.append({
                **email,
                "feedback": audit.get("feedback"),
                "feedback_note": audit.get("feedback_note"),
                "escalation_feedback": audit.get("escalation_feedback"),
                "escalation_feedback_note": audit.get("escalation_feedback_note"),
                "draft_response": audit.get("draft_response"),
                "approved": audit.get("approved", False),
                "approved_at": audit.get("approved_at"),
                "email_body": email.get("email_body", audit.get("email_body", "")),
                "reply_body": email.get("reply_body"),
                "reply_subject": email.get("reply_subject"),
            })
        return enriched
    except (FileNotFoundError, json.JSONDecodeError):
        return _recent_emails


class ApproveRequest(BaseModel):
    entry_id: str
    draft_body: str | None = None
    draft_subject: str | None = None


@router.post("/approve-and-send")
async def approve_and_send(req: ApproveRequest):
    """AP clerk approves the AI-drafted response for a SHORT_PAY escalation and sends it."""
    try:
        with open(AUDIT_LOG_PATH) as f:
            audit_log = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        raise HTTPException(status_code=500, detail="Could not load audit log")

    entry = next((e for e in audit_log if e["entry_id"] == req.entry_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Audit entry not found")

    if entry.get("approved"):
        return {"status": "already_sent"}

    draft = entry.get("draft_response")
    # Fall back to the body provided by the frontend (for demo/pre-seeded entries)
    if (not draft or not draft.get("body")) and req.draft_body:
        draft = {
            "body": req.draft_body,
            "subject": req.draft_subject or f"Re: {entry.get('email_subject', '')}",
        }
    if not draft or not draft.get("body"):
        raise HTTPException(status_code=400, detail="No draft response available to send")

    to_addr = entry.get("email_from_addr", "")
    if not to_addr:
        # Demo/pre-seeded entry — mark as approved without sending a real email
        entry["approved"] = True
        entry["approved_at"] = datetime.now(timezone.utc).isoformat()
        with open(AUDIT_LOG_PATH, "w") as f:
            json.dump(audit_log, f, indent=2)
        return {"status": "sent", "simulated": True}

    try:
        await gmail_service.send_reply(
            thread_id=entry.get("email_thread_id", ""),
            to=to_addr,
            subject=draft.get("subject", f"Re: {entry.get('email_subject', '')}"),
            body=draft["body"],
            message_id=entry.get("email_message_id", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reply: {str(e)}")

    # Update audit log
    entry["approved"] = True
    entry["approved_at"] = datetime.now(timezone.utc).isoformat()
    with open(AUDIT_LOG_PATH, "w") as f:
        json.dump(audit_log, f, indent=2)

    # Update recent_emails so the UI refreshes correctly
    try:
        recent = _load_recent_emails()
        for r in recent:
            if r["entry_id"] == req.entry_id:
                r["approved"] = True
                break
        with open(RECENT_EMAILS_PATH, "w") as f:
            json.dump(recent, f, indent=2)
        global _recent_emails
        _recent_emails = recent
    except Exception:
        pass

    return {"status": "sent"}
