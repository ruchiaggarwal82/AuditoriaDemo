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


def is_configured() -> bool:
    return bool(os.getenv("SLACK_WEBHOOK_URL", ""))
