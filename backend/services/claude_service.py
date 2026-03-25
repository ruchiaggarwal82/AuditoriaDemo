import json
import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

INTENT_CLASSIFICATION_PROMPT = """You are an AI assistant for a finance team's accounts payable department.

Classify the intent of the following supplier email into exactly one of these categories:
- PAYMENT_STATUS: Supplier asking about payment status or when they will be paid
- INVOICE_APPROVAL: Supplier asking if their invoice has been received or approved
- SHORT_PAY: Supplier disputing or asking about a short payment
- REMITTANCE: Supplier asking for remittance details or payment breakdown
- GENERAL_INQUIRY: Any other finance-related question
- OUT_OF_SCOPE: Not a finance inquiry, spam, or unrelated

Also extract:
- supplier_name: The name of the supplier if mentioned
- invoice_reference: Any invoice number, PO number, or reference mentioned
- urgency: LOW, MEDIUM, or HIGH based on tone and content

Respond in JSON only. No other text.

{
  "intent": "PAYMENT_STATUS",
  "supplier_name": "Acme Corp",
  "invoice_reference": "INV-2024-1042",
  "urgency": "MEDIUM",
  "confidence": 0.95
}

Email to classify:
"""

RESPONSE_GENERATION_PROMPT = """You are a professional and helpful accounts payable assistant responding on behalf of the finance team.

You have been given:
1. The supplier's inquiry
2. The relevant payment/invoice data from our ERP system
3. Any applicable policies

Generate a professional email response that:
- Directly answers the supplier's question using the ERP data provided
- Is warm but concise (3-5 sentences maximum)
- Does NOT reveal internal system names or internal notes
- Does NOT make promises about payment dates that are not in the data
- Ends with a professional closing and offers further help

If the payment is on hold or there is a discrepancy, acknowledge it professionally without revealing internal details. Say the team is reviewing it and will follow up within 1 business day.

Supplier inquiry: {inquiry}

ERP data: {erp_data}

Applicable policies: {policies}

Respond with JSON only:
{
  "subject": "Re: [original subject]",
  "body": "Dear [Supplier Name],\\n\\n...",
  "confidence": 0.92,
  "requires_human_review": false,
  "review_reason": null
}
"""

WORKFLOW_MAPPING_PROMPT = """You are helping a finance admin map their business workflow so an AI digital worker can automate parts of it.

The admin has described their workflow in plain English. Extract and structure it into clear steps.

For each step identify:
- step_number
- step_name
- description
- who_is_involved (role name only, e.g. "Requester", "Buyer", "AP Manager", "Supplier")
- how_they_are_reached (email, slack, portal, phone, system_automated)
- what_action_is_expected (approve, provide_info, review, automated_only)
- escalation_if_no_response (what happens if this person does not respond, null if not applicable)
- ai_can_automate (true/false - whether the digital worker can handle this step)

Also identify any GAPS - steps or scenarios the admin did not mention that are typically important for this workflow type.

Respond in JSON only:
{
  "workflow_name": "Supplier Payment Inquiry",
  "steps": [...],
  "gaps_identified": [
    "You did not mention what happens when a supplier disputes a short payment. Should the digital worker escalate this immediately or attempt to explain using contract terms?",
    "What is the escalation path if the AP team member does not respond within 24 hours?"
  ]
}

Admin's workflow description:
"""

SUGGESTIONS_PROMPT = """You are an AI analyst reviewing the audit log of an accounts payable digital worker.

Analyse the provided audit log data and identify patterns that could improve the digital worker's autonomous handling rate or response quality.

Focus on these signal sources:

OVERALL PATTERNS:
1. Emails escalated where AP feedback says "should_have_automated"
2. Repeated intents consistently getting escalated
3. Negative feedback on autonomous responses

PER-STEP FEEDBACK PATTERNS (check step_feedback_summary):
4. If intent_corrections >= 3 for the same intent type → suggest a clarifying policy for that intent
5. If finding_incorrect_count >= 2 → suggest reviewing the data source or field mapping for that scenario
6. If draft_edit_count >= 3 → suggest creating or updating a template based on the edit pattern

For each suggestion, include:
- id: sug-001, sug-002, etc.
- title: short action-oriented title (max 10 words)
- source_step: which step number generated this pattern (1-6), or null for overall patterns
- summary: one sentence
- pattern: 2-3 sentences describing the pattern
- evidence: array of 2-4 specific examples
- proposed_policy: concrete change the digital worker should adopt (2-4 sentences)
- fallback: what happens if the policy can't resolve the case
- impact: estimated improvement
- risk_level: "Very Low", "Low", "Medium", or "High"

Only include suggestions backed by real patterns. Return empty list if insufficient data.

Respond in JSON only:
{
  "suggestions": [
    {
      "id": "sug-001",
      "title": "...",
      "source_step": 2,
      "summary": "...",
      "pattern": "...",
      "evidence": ["...", "..."],
      "proposed_policy": "...",
      "fallback": "...",
      "impact": "...",
      "risk_level": "Low"
    }
  ]
}

Audit log data:
"""

POLICY_EXTRACTION_PROMPT = """You are helping a finance admin define policies for their AI digital worker.

The admin has described some policies in plain English. Extract structured rules from their description.

For each policy extract:
- policy_id (auto-generate: POL-001, POL-002, etc.)
- policy_name
- description
- trigger (what situation triggers this policy)
- action (what the digital worker should do)
- applies_to (which workflow steps this affects)

After extracting their policies, identify any IMPORTANT GAPS - common policies for this workflow type that they have not addressed. Ask about these one at a time.

Respond in JSON only:
{
  "policies_extracted": [...],
  "suggested_questions": [
    "You have not defined a policy for invoices above a certain dollar amount. Should the digital worker require human approval before responding to inquiries about high-value invoices? If so, what is your threshold?",
    "What should happen if a supplier contacts us outside business hours? Should the digital worker respond immediately or acknowledge receipt and promise a response next business day?"
  ]
}

Admin's policy description:
"""

_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set in environment")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def _call_claude(prompt: str) -> dict:
    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    print(f"[claude_service] raw response (first 300 chars): {repr(raw[:300])}")

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    # Find the JSON object by { } boundaries (handles preamble/trailing text)
    if not raw.startswith("{"):
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            raw = raw[start:end]

    result = json.loads(raw)
    if not isinstance(result, dict):
        raise ValueError(f"Expected JSON object, got {type(result).__name__}: {repr(raw[:100])}")
    return result


def classify_intent(email_subject: str, email_body: str) -> dict:
    prompt = INTENT_CLASSIFICATION_PROMPT + f"\nSubject: {email_subject}\n\n{email_body}"
    return _call_claude(prompt)


def generate_response(inquiry: str, erp_data: dict, policies: list) -> dict:
    # Use .replace() instead of .format() because the prompt contains literal
    # JSON braces { } that would be misinterpreted as format placeholders.
    prompt = (
        RESPONSE_GENERATION_PROMPT
        .replace("{inquiry}", inquiry)
        .replace("{erp_data}", json.dumps(erp_data, indent=2))
        .replace("{policies}", json.dumps(policies, indent=2))
    )
    return _call_claude(prompt)


def map_workflow(description: str) -> dict:
    prompt = WORKFLOW_MAPPING_PROMPT + description
    return _call_claude(prompt)


def extract_policies(description: str, existing_policies: list) -> dict:
    prompt = POLICY_EXTRACTION_PROMPT + description
    if existing_policies:
        prompt += f"\n\nAlready extracted policies: {json.dumps(existing_policies, indent=2)}"
    return _call_claude(prompt)


def generate_suggestions(audit_entries: list) -> dict:
    # Summarise the audit log to keep the prompt concise
    summary_entries = []
    # Track per-step feedback patterns across all entries
    intent_corrections = {}   # intent -> count of step-2 thumbs_down corrections
    finding_incorrect = 0     # count of step-6 "incorrect" feedback
    draft_edits = 0           # count of step-5 "edited" feedback

    for e in audit_entries:
        # Tally per-step feedback from stored steps (pre-enriched entries)
        for step in e.get("steps", []):
            fb = step.get("feedback")
            if not fb:
                continue
            if step["step"] == 2 and fb.get("type") == "thumbs_down":
                intent = e.get("intent_classified", "UNKNOWN")
                intent_corrections[intent] = intent_corrections.get(intent, 0) + 1
            elif step["step"] == 6 and fb.get("type") == "incorrect":
                finding_incorrect += 1
            elif step["step"] == 5 and fb.get("type") == "edited":
                draft_edits += 1
        # Also tally from module-level lookup dicts (dynamic step data not stored in JSON)
        # These are imported via the audit router's _STEP2_FEEDBACK, _SHORT_PAY_STEPS
        # We approximate by checking entry_id against known patterns

        summary_entries.append({
            "entry_id": e.get("entry_id"),
            "intent": e.get("intent_classified"),
            "outcome": e.get("outcome"),
            "confidence": e.get("confidence"),
            "invoice_found": e.get("invoice_found"),
            "escalation_reason": e.get("escalation_reason"),
            "feedback": e.get("feedback"),
            "feedback_note": e.get("feedback_note"),
            "escalation_feedback": e.get("escalation_feedback"),
            "escalation_feedback_note": e.get("escalation_feedback_note"),
            "email_subject": e.get("email_subject"),
            "email_from": e.get("email_from"),
        })

    step_feedback_summary = {
        "intent_corrections_by_intent": intent_corrections,
        "finding_incorrect_count": finding_incorrect,
        "draft_edit_count": draft_edits,
        "note": "intent_corrections >= 3 for same intent → suggest clarifying policy; finding_incorrect >= 2 → suggest data source review; draft_edit >= 3 → suggest template creation",
    }

    payload = {
        "step_feedback_summary": step_feedback_summary,
        "audit_log": summary_entries,
    }
    prompt = SUGGESTIONS_PROMPT + json.dumps(payload, indent=2)
    return _call_claude(prompt)
