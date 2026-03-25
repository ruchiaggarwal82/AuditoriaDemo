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


# ERP snapshots for known demo invoices — mirrors erp_data.json + plausible extras
_ERP_SNAPSHOTS = {
    "INV-2024-1042": {"amount": 12500, "status": "scheduled", "due_date": "2024-03-25", "payment_date": "2024-03-28", "notes": ""},
    "INV-2024-1039": {"amount": 8750,  "status": "paid",      "due_date": "2024-03-18", "payment_date": "2024-03-18", "notes": "Paid in full"},
    "INV-2024-1051": {"amount": 45000, "status": "on_hold",   "due_date": "2024-03-22", "payment_date": None,         "notes": "On hold pending 3-way match discrepancy review"},
    "INV-2024-1038": {"amount": 3200,  "status": "short_paid","due_date": "2024-03-15", "payment_date": "2024-03-15", "notes": "Short paid by $450 due to freight damage deduction per contract clause 8.2"},
    "INV-2024-1047": {"amount": 18500, "status": "pending_approval","due_date": "2024-04-05","payment_date": None,    "notes": "Invoice received, pending 3-way PO match and AP manager approval"},
    "INV-2024-1055": {"amount": 9600,  "status": "short_paid","due_date": "2024-03-20", "payment_date": "2024-03-20", "notes": "Short paid by $960 — 10% quality penalty applied per contract clause 5.4 (batch QC failure)"},
    "INV-2024-1058": {"amount": 7800,  "status": "paid",      "due_date": "2024-03-20", "payment_date": "2024-03-19", "notes": ""},
    "INV-2024-1060": {"amount": 22000, "status": "scheduled", "due_date": "2024-04-01", "payment_date": "2024-04-03", "notes": ""},
    "INV-2024-1065": {"amount": 15000, "status": "on_hold",   "due_date": "2024-03-28", "payment_date": None,         "notes": "On hold pending vendor certification review"},
    "INV-2024-1071": {"amount": 18500, "status": "pending_approval","due_date": "2024-04-05","payment_date": None,    "notes": "Invoice received, pending AP manager approval"},
    "INV-2024-1080": {"amount": 24500, "status": "pending_approval","due_date": "2024-04-10","payment_date": None,    "notes": "New invoice submitted, awaiting 3-way PO match"},
    "INV-2024-1088": {"amount": 6400,  "status": "short_paid","due_date": "2024-03-25", "payment_date": "2024-03-25", "notes": "Short paid by $180 — standard freight charge deduction per carrier invoice CI-2024-1181"},
    "INV-2024-1091": {"amount": 5200,  "status": "short_paid","due_date": "2024-03-27", "payment_date": "2024-03-27", "notes": "Short paid by $95 — freight deduction per carrier invoice CI-2024-1194"},
}

# Rich step-5 / step-6 data for SHORT_PAY demo entries
_SHORT_PAY_STEPS = {
    "audit-002": {
        "step5": {
            "step": 5, "name": "Response Generation", "type": "PROBABILISTIC",
            "result": {"method": "ai_draft", "draft_subject": "Re: Short payment on PO-8821", "draft_body": "Dear Billing Team,\n\nThank you for your message. Payment of $8,640 was processed on 2024-03-20 for invoice INV-2024-1055. A deduction of $960 was applied per contract clause 5.4 following a documented batch quality control failure.\n\nPlease reach out if you have further questions.\n\nBest regards,\nAccounts Payable Team"},
            "feedback": {"type": "edited", "edit_summary": "Added QC report reference number and exact deduction clause citation"},
        },
        "step6": {
            "step": 6, "name": "Data Finding", "type": "PROBABILISTIC",
            "result": {"finding": "Contract clause 5.4 authorizes a 10% quality penalty upon documented batch QC failure. QC report #QC-2024-0318 (filed 2024-03-15) confirms the failure, supporting a $960 deduction (10% of $9,600).", "source": "Supplier contract PO-8862 / QC Report #QC-2024-0318", "confidence": 0.87},
            "feedback": None,
        },
    },
    "audit-012": {
        "step5": {
            "step": 5, "name": "Response Generation", "type": "PROBABILISTIC",
            "result": {"method": "ai_draft", "draft_subject": "Re: Short paid invoice INV-2024-1039 - only $8500 received", "draft_body": "Dear Finance Team,\n\nThank you for contacting us. Our records confirm invoice INV-2024-1039 was settled in full for $8,750 on 2024-03-18 via wire transfer. The $250 shortfall may reflect a bank transfer fee applied on the recipient side. Our AP Manager is reviewing and will follow up within one business day.\n\nBest regards,\nAccounts Payable Team"},
            "feedback": None,
        },
        "step6": {
            "step": 6, "name": "Data Finding", "type": "PROBABILISTIC",
            "result": {"finding": "ERP confirms full payment of $8,750 on 2024-03-18 via wire transfer. No deduction was authorized. $250 discrepancy is not accounted for in ERP — likely a bank intermediary fee.", "source": "ERP payment record INV-2024-1039 / Bank reconciliation log", "confidence": 0.69},
            "feedback": None,
        },
    },
    "audit-021": {
        "step5": {
            "step": 5, "name": "Response Generation", "type": "PROBABILISTIC",
            "result": {"method": "ai_draft", "draft_subject": "Re: INV-2024-1058 short paid by $1,200", "draft_body": "Dear Billing Team,\n\nThank you for your message. Payment of $6,600 was processed on 2024-03-19 for invoice INV-2024-1058 ($7,800). A $1,200 deduction reflects quality inspection findings per contract clause 4.7. Our AP Manager will follow up within one business day.\n\nBest regards,\nAccounts Payable Team"},
            "feedback": {"type": "edited", "edit_summary": "Added inspection report number and revised tone to be more direct about the contractual basis"},
        },
        "step6": {
            "step": 6, "name": "Data Finding", "type": "PROBABILISTIC",
            "result": {"finding": "Contract clause 4.7 permits deductions for failed component inspections when supported by a signed inspection report. Report INS-2024-0312 documents the failure, supporting the $1,200 deduction on INV-2024-1058.", "source": "Supplier contract PO-8852 / Inspection Report INS-2024-0312", "confidence": 0.78},
            "feedback": None,
        },
    },
    "audit-031": {
        "step5": {
            "step": 5, "name": "Response Generation", "type": "PROBABILISTIC",
            "result": {"method": "ai_draft", "draft_subject": "Re: Short payment on INV-2024-1088 — $180 deducted", "draft_body": "Dear Billing Team,\n\nThank you for your message regarding invoice INV-2024-1088. A $180 deduction was applied related to freight charges on this shipment. Our team is reviewing and will follow up within one business day.\n\nBest regards,\nAccounts Payable Team"},
            "feedback": {"type": "edited", "edit_summary": "Replaced vague language with explicit freight deduction policy explanation and carrier invoice reference"},
        },
        "step6": {
            "step": 6, "name": "Data Finding", "type": "PROBABILISTIC",
            "result": {"finding": "Standard freight adjustment — $180 deduction per carrier invoice CI-2024-1181. Contract clause 12.1 allows freight deductions for verified carrier charges. Amount is within the standard freight auto-approval threshold.", "source": "Carrier invoice CI-2024-1181 / Contract clause 12.1", "confidence": 0.83},
            "feedback": {"type": "incorrect"},
        },
    },
    "audit-032": {
        "step5": {
            "step": 5, "name": "Response Generation", "type": "PROBABILISTIC",
            "result": {"method": "ai_draft", "draft_subject": "Re: Short pay on INV-2024-1091 — freight deduction $95", "draft_body": "Dear Finance Team,\n\nThank you for reaching out about invoice INV-2024-1091. A $95 deduction was applied for a freight charge adjustment. Our team is reviewing and will respond within one business day.\n\nBest regards,\nAccounts Payable Team"},
            "feedback": None,
        },
        "step6": {
            "step": 6, "name": "Data Finding", "type": "PROBABILISTIC",
            "result": {"finding": "Freight deduction of $95 per carrier invoice CI-2024-1194. Contract clause 12.1 permits verified freight deductions. Amount is below the $150 standard freight deduction threshold.", "source": "Carrier invoice CI-2024-1194 / Contract clause 12.1", "confidence": 0.80},
            "feedback": {"type": "incorrect"},
        },
    },
}

# Pre-set intent correction feedback (drives Change 5 learning pattern detection)
_STEP2_FEEDBACK = {
    "audit-008": {"type": "thumbs_down", "issue": "wrong_intent", "note": "Standard payment terms question — should be handled autonomously, not escalated"},
    "audit-024": {"type": "thumbs_down", "issue": "wrong_intent", "note": "Early payment discount is a standard FAQ — needs an automated response policy"},
    "audit-022": {"type": "thumbs_down", "issue": "ambiguous_message", "note": "Routine acknowledgment scenario — confidence threshold too conservative"},
}


def _generate_steps(entry: dict) -> list:
    """Reconstruct step-by-step breakdown from a flat audit log entry."""
    intent = entry.get("intent_classified", "UNKNOWN")
    confidence = entry.get("confidence", 0)
    invoice_found = entry.get("invoice_found", False)
    invoice_id = entry.get("invoice_id")
    outcome = entry.get("outcome", "ESCALATED")
    escalation_reason = entry.get("escalation_reason", "")

    is_on_hold = "on hold" in (escalation_reason or "").lower() or "on_hold" in (escalation_reason or "").lower()
    is_not_found = not invoice_found
    is_short_pay = intent == "SHORT_PAY"
    is_low_confidence = confidence < 0.85 and outcome == "ESCALATED" and not is_on_hold and not is_not_found
    is_invoice_approval = intent == "INVOICE_APPROVAL"
    is_out_of_scope = intent == "OUT_OF_SCOPE"

    # Alternative intents by primary intent
    alt_map = {
        "PAYMENT_STATUS":   [{"intent": "GENERAL_INQUIRY", "score": round(1 - confidence - 0.01, 2)}, {"intent": "REMITTANCE", "score": 0.01}],
        "SHORT_PAY":        [{"intent": "PAYMENT_STATUS", "score": 0.08}, {"intent": "GENERAL_INQUIRY", "score": round(1 - confidence - 0.08, 2)}],
        "REMITTANCE":       [{"intent": "PAYMENT_STATUS", "score": 0.07}, {"intent": "GENERAL_INQUIRY", "score": round(1 - confidence - 0.07, 2)}],
        "INVOICE_APPROVAL": [{"intent": "PAYMENT_STATUS", "score": 0.10}, {"intent": "GENERAL_INQUIRY", "score": round(1 - confidence - 0.10, 2)}],
        "GENERAL_INQUIRY":  [{"intent": "PAYMENT_STATUS", "score": 0.15}, {"intent": "OUT_OF_SCOPE", "score": round(1 - confidence - 0.15, 2)}],
        "OUT_OF_SCOPE":     [{"intent": "GENERAL_INQUIRY", "score": 0.09}, {"intent": "PAYMENT_STATUS", "score": round(1 - confidence - 0.09, 2)}],
    }
    alternatives = alt_map.get(intent, [{"intent": "GENERAL_INQUIRY", "score": 0.05}])
    # clamp scores
    alternatives = [{"intent": a["intent"], "score": max(0.01, round(a["score"], 2))} for a in alternatives]

    # Look up ERP snapshot and step feedback from module-level dicts
    erp_snap = _ERP_SNAPSHOTS.get(invoice_id or "", {})
    short_pay_data = _SHORT_PAY_STEPS.get(entry.get("entry_id", ""), {})
    step2_fb = _STEP2_FEEDBACK.get(entry.get("entry_id", ""))

    steps = []

    # Step 1 — Gate Check (DETERMINISTIC)
    invoice_ref_found = not is_out_of_scope
    steps.append({
        "step": 1,
        "name": "Gate Check",
        "type": "DETERMINISTIC",
        "result": {
            "sender_verified": True,
            "invoice_reference_found": invoice_ref_found,
            "compliance_check_passed": True,
        },
    })

    # Step 2 — Intent Classification (PROBABILISTIC)
    steps.append({
        "step": 2,
        "name": "Intent Classification",
        "type": "PROBABILISTIC",
        "result": {
            "classified_intent": intent,
            "confidence": confidence,
            "alternatives": alternatives,
        },
        "feedback": step2_fb,
    })

    # Step 3 — ERP Data Retrieval (DETERMINISTIC)
    if is_out_of_scope:
        erp_fields = []
        erp_note = "No ERP lookup performed — email is out of scope."
    elif is_not_found:
        erp_fields = [{"field": "invoice.id", "path": "invoices[].invoice_id", "value": invoice_id, "status": "not_found"}]
        erp_note = None
    else:
        erp_fields = [{"field": "invoice.id", "path": "invoices[].invoice_id", "value": invoice_id, "status": "found"}]
        if erp_snap.get("amount") is not None:
            erp_fields.append({"field": "invoice.amount", "path": "invoices[].amount", "value": str(erp_snap["amount"]), "status": "found"})
        if erp_snap.get("status"):
            erp_fields.append({"field": "invoice.status", "path": "invoices[].status", "value": erp_snap["status"], "status": "found"})
            hold = erp_snap["status"] == "on_hold"
            erp_fields.append({"field": "invoice.hold_status", "path": 'invoices[].status == "on_hold"', "value": str(hold).lower(), "status": "found"})
            if hold and erp_snap.get("notes"):
                erp_fields.append({"field": "invoice.hold_reason", "path": "invoices[].notes", "value": erp_snap["notes"], "status": "found"})
        if erp_snap.get("payment_date"):
            erp_fields.append({"field": "invoice.payment_date", "path": "invoices[].payment_date", "value": erp_snap["payment_date"], "status": "found"})
        elif erp_snap.get("status") in ("on_hold", "pending_approval", "short_paid"):
            erp_fields.append({"field": "invoice.payment_date", "path": "invoices[].payment_date", "value": None, "status": "null"})
        if erp_snap.get("due_date"):
            erp_fields.append({"field": "invoice.due_date", "path": "invoices[].due_date", "value": erp_snap["due_date"], "status": "found"})
        erp_note = None

    steps.append({
        "step": 3,
        "name": "ERP Data Retrieval",
        "type": "DETERMINISTIC",
        "result": {"fields": erp_fields, "note": erp_note},
    })

    # Step 4 — Policy Match (DETERMINISTIC)
    amount = erp_snap.get("amount", 0) or 0
    pol1 = amount > 25000
    pol2 = is_on_hold
    pol3 = is_low_confidence

    if is_out_of_scope:
        policy_result = {"policy_triggered": None, "check": "Email classified as OUT_OF_SCOPE — no policy evaluation performed."}
    elif is_not_found:
        policy_result = {"policy_triggered": None, "check": "Invoice not found in ERP — cannot evaluate policy rules."}
    elif is_short_pay:
        policy_result = {"policy_triggered": None, "check": "SHORT_PAY intent detected — payment disputes require AP Manager review per workflow design."}
    elif is_invoice_approval:
        policy_result = {"policy_triggered": "WORKFLOW_RULE", "policy_name": "Invoice approval requires human authorization", "trigger_field": "intent", "trigger_value": "INVOICE_APPROVAL", "check": "INVOICE_APPROVAL intent — all approvals require human sign-off per workflow design."}
    elif pol2 and pol1:
        policy_result = {"policy_triggered": "POL-001 + POL-002", "policy_name": "High-value + on-hold escalation", "trigger_field": "invoice.hold_status + invoice.amount", "trigger_value": f"true + ${amount:,.0f}", "check": f"invoice.hold_status = true → POL-002 triggered. Amount ${amount:,.0f} exceeds $25,000 → POL-001 also triggered. Escalating."}
    elif pol2:
        policy_result = {"policy_triggered": "POL-002", "policy_name": "On-hold invoice escalation", "trigger_field": "invoice.hold_status", "trigger_value": "true", "check": "invoice.hold_status = true → POL-002 triggered: escalate to AP Manager for review."}
    elif pol1:
        policy_result = {"policy_triggered": "POL-001", "policy_name": "High-value invoice escalation", "trigger_field": "invoice.amount", "trigger_value": f"${amount:,.0f}", "check": f"Amount ${amount:,.0f} exceeds $25,000 → POL-001 triggered: AP Manager notification required."}
    elif pol3:
        policy_result = {"policy_triggered": "POL-003", "policy_name": "Low confidence escalation", "trigger_field": "confidence", "trigger_value": f"{round(confidence * 100)}%", "check": f"Confidence {round(confidence * 100)}% below 85% threshold → POL-003 triggered: escalate to AP Manager."}
    else:
        pol_check = f"Amount ${amount:,.0f} below $25,000 (POL-001 ok). Status not on_hold (POL-002 ok). Confidence {round(confidence * 100)}% above 85% (POL-003 ok). No policy triggered." if amount else f"No policy triggered. Confidence {round(confidence * 100)}% above 85% threshold."
        policy_result = {"policy_triggered": None, "check": pol_check}

    steps.append({"step": 4, "name": "Policy Match", "type": "DETERMINISTIC", "result": policy_result})

    # Step 5 — Response Generation or Escalation
    if short_pay_data.get("step5"):
        steps.append(short_pay_data["step5"])
    elif outcome == "AUTONOMOUS":
        steps.append({
            "step": 5, "name": "Response Generation", "type": "DETERMINISTIC",
            "result": {"method": "template", "template_used": "Payment Status Response", "template_id": "tmpl-001"},
            "feedback": None,
        })
    elif is_short_pay:
        steps.append({
            "step": 5, "name": "Response Generation", "type": "PROBABILISTIC",
            "result": {
                "method": "ai_draft",
                "draft_subject": f"Re: {entry.get('email_subject', 'Short payment inquiry')}",
                "draft_body": "Dear Supplier,\n\nThank you for reaching out regarding the payment discrepancy. Our AP Manager is reviewing the details and will provide a full response within one business day.\n\nBest regards,\nAccounts Payable Team",
            },
            "feedback": None,
        })
    elif is_low_confidence:
        steps.append({
            "step": 5, "name": "Escalation", "type": "PROBABILISTIC",
            "result": {"method": "low_confidence", "confidence": confidence, "reason": f"Confidence {round(confidence * 100)}% below 85% threshold — escalated rather than risk an incorrect response.", "escalated_to": "AP Manager via Slack"},
            "feedback": None,
        })
    else:
        triggered = policy_result.get("policy_triggered") or "workflow rule"
        steps.append({
            "step": 5, "name": "Escalation", "type": "DETERMINISTIC",
            "result": {"method": "policy_escalation", "policy_triggered": triggered, "escalated_to": "AP Manager via Slack", "reason": escalation_reason or "Policy or workflow rule triggered."},
        })

    # Step 6 — Data Finding (SHORT_PAY / disputed only)
    if is_short_pay:
        if short_pay_data.get("step6"):
            steps.append(short_pay_data["step6"])
        else:
            steps.append({
                "step": 6, "name": "Data Finding", "type": "PROBABILISTIC",
                "result": {
                    "finding": "Payment discrepancy identified. Reviewing contract terms and carrier invoices for applicable deduction clauses.",
                    "source": "ERP payment records / Supplier contract",
                    "confidence": 0.72,
                },
                "feedback": None,
            })

    return steps


class FeedbackRequest(BaseModel):
    entry_id: str
    feedback: str  # "positive" or "negative"
    note: str = ""


class EscalationFeedbackRequest(BaseModel):
    entry_id: str
    escalation_feedback: str  # "justified" or "should_have_automated"
    escalation_feedback_note: str = ""


class StepFeedbackRequest(BaseModel):
    entry_id: str
    step: int
    feedback_type: str  # "thumbs_up" | "thumbs_down" | "edited" | "correct" | "incorrect" | "partial"
    data: dict = {}


@router.get("/steps/{entry_id}")
def get_steps(entry_id: str):
    log = _load_log()
    for entry in log:
        if entry["entry_id"] == entry_id:
            # If pre-stored steps exist, return them (allows pre-enriched demo entries)
            if entry.get("steps"):
                return {"steps": entry["steps"]}
            # Otherwise generate dynamically from flat fields
            return {"steps": _generate_steps(entry)}
    raise HTTPException(status_code=404, detail="Audit entry not found")


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


@router.post("/step-feedback")
def record_step_feedback(req: StepFeedbackRequest):
    log = _load_log()
    for entry in log:
        if entry["entry_id"] == req.entry_id:
            steps = entry.get("steps")
            if not steps:
                raise HTTPException(status_code=404, detail="No steps data for this entry")
            for step in steps:
                if step["step"] == req.step:
                    step["feedback"] = {"type": req.feedback_type, **req.data}
                    _save_log(log)
                    return {"status": "feedback_recorded"}
            raise HTTPException(status_code=404, detail=f"Step {req.step} not found")
    raise HTTPException(status_code=404, detail="Audit entry not found")
