import os
import base64
import email as email_lib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dotenv import load_dotenv

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

_service = None


def get_service():
    global _service
    if _service is not None:
        return _service

    client_id = os.getenv("GMAIL_CLIENT_ID")
    client_secret = os.getenv("GMAIL_CLIENT_SECRET")
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN")

    if not all([client_id, client_secret, refresh_token]):
        raise ValueError(
            "Gmail credentials not configured. Set GMAIL_CLIENT_ID, "
            "GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN in .env"
        )

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=SCOPES,
    )

    _service = build("gmail", "v1", credentials=creds)
    return _service


def _extract_body(payload: dict) -> str:
    """Recursively extract plain text body from Gmail message payload."""
    mime_type = payload.get("mimeType", "")
    if mime_type == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    if mime_type.startswith("multipart/"):
        for part in payload.get("parts", []):
            result = _extract_body(part)
            if result:
                return result
    return ""


async def get_unread_emails() -> list[dict]:
    """Poll inbox for unread emails from suppliers."""
    try:
        service = get_service()
        demo_address = os.getenv("GMAIL_DEMO_ADDRESS", "")
        result = service.users().messages().list(
            userId="me",
            q=f"to:{demo_address} is:unread",
            maxResults=20,
        ).execute()

        messages = result.get("messages", [])
        emails = []

        for msg_ref in messages:
            msg = service.users().messages().get(
                userId="me",
                id=msg_ref["id"],
                format="full",
            ).execute()

            headers = {h["name"].lower(): h["value"] for h in msg["payload"]["headers"]}
            body = _extract_body(msg["payload"])
            internal_date = int(msg.get("internalDate", 0)) / 1000
            timestamp = datetime.fromtimestamp(internal_date, tz=timezone.utc).isoformat()

            emails.append({
                "id": msg["id"],
                "thread_id": msg["threadId"],
                "from": headers.get("from", ""),
                "to": headers.get("to", ""),
                "subject": headers.get("subject", "(no subject)"),
                "body": body,
                "timestamp": timestamp,
            })

        return emails

    except HttpError as e:
        print(f"Gmail API error: {e}")
        return []
    except Exception as e:
        print(f"Gmail service error: {e}")
        return []


async def send_reply(thread_id: str, to: str, subject: str, body: str):
    """Send a reply in an existing thread."""
    try:
        service = get_service()
        demo_address = os.getenv("GMAIL_DEMO_ADDRESS", "me")

        mime_msg = MIMEMultipart("alternative")
        mime_msg["Subject"] = subject
        mime_msg["From"] = demo_address
        mime_msg["To"] = to
        mime_msg["In-Reply-To"] = thread_id
        mime_msg["References"] = thread_id
        mime_msg.attach(MIMEText(body, "plain"))

        raw = base64.urlsafe_b64encode(mime_msg.as_bytes()).decode("utf-8")
        service.users().messages().send(
            userId="me",
            body={"raw": raw, "threadId": thread_id},
        ).execute()

    except HttpError as e:
        print(f"Gmail send error: {e}")
        raise


async def mark_as_read(message_id: str):
    """Remove UNREAD label from a message."""
    try:
        service = get_service()
        service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"removeLabelIds": ["UNREAD"]},
        ).execute()
    except HttpError as e:
        print(f"Gmail mark-read error: {e}")


def is_connected() -> bool:
    """Check whether Gmail credentials are configured and usable."""
    try:
        service = get_service()
        service.users().getProfile(userId="me").execute()
        return True
    except Exception:
        return False
