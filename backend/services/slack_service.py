import os
import httpx
from dotenv import load_dotenv

load_dotenv()


def get_webhook_url() -> str:
    url = os.getenv("SLACK_WEBHOOK_URL", "")
    if not url:
        raise ValueError("SLACK_WEBHOOK_URL not set in .env")
    return url


async def send_escalation(email: dict, reason: str, erp_data: dict = None):
    """Send an escalation notification to the #ap-escalations Slack channel."""
    invoice_id = erp_data.get("invoice_id", "Not found") if erp_data else "Not found"

    payload = {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "⚠️ Escalation Required"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*From:* {email['from']}"},
                    {"type": "mrkdwn", "text": f"*Subject:* {email['subject']}"},
                    {"type": "mrkdwn", "text": f"*Reason:* {reason}"},
                    {"type": "mrkdwn", "text": f"*Invoice:* {invoice_id}"},
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Supplier message:*\n{email['body'][:500]}",
                },
            },
        ]
    }

    webhook_url = get_webhook_url()
    async with httpx.AsyncClient() as client:
        resp = await client.post(webhook_url, json=payload, timeout=10)
        resp.raise_for_status()


async def send_short_pay_escalation(email: dict, erp_data: dict, draft_response: dict = None):
    """Send a rich short-payment escalation to #ap-escalations with invoice details and draft."""
    invoice_id = erp_data.get("invoice_id", "—")
    supplier = erp_data.get("supplier_name", email["from"])
    amount = erp_data.get("amount", 0)
    notes = erp_data.get("notes", "No notes available")

    draft_preview = ""
    if draft_response and draft_response.get("body"):
        preview = draft_response["body"][:400].strip()
        draft_preview = f"\n\n*AI-drafted response (pending your approval):*\n```{preview}…```"

    payload = {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "🔴 Short Payment Dispute — AP Review Required"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Supplier:* {supplier}"},
                    {"type": "mrkdwn", "text": f"*Invoice:* {invoice_id}"},
                    {"type": "mrkdwn", "text": f"*Invoice Amount:* ${amount:,.2f}"},
                    {"type": "mrkdwn", "text": f"*Status:* Short paid"},
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*ERP Notes:* {notes}{draft_preview}",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Supplier message:*\n{email['body'][:400]}",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "👉 Open *Auditoria Monitor* to review the full draft and approve sending to the supplier.",
                    }
                ],
            },
        ]
    }

    webhook_url = get_webhook_url()
    async with httpx.AsyncClient() as client:
        resp = await client.post(webhook_url, json=payload, timeout=10)
        resp.raise_for_status()


def is_configured() -> bool:
    return bool(os.getenv("SLACK_WEBHOOK_URL", ""))

