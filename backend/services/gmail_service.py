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
                "message_id": headers.get("message-id", ""),
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


async def send_reply(thread_id: str, to: str, subject: str, body: str, message_id: str = ""):
    """Send a reply in an existing thread."""
    try:
        service = get_service()
        demo_address = os.getenv("GMAIL_DEMO_ADDRESS", "me")

        mime_msg = MIMEMultipart("alternative")
        mime_msg["Subject"] = subject if subject.startswith("Re:") else f"Re: {subject}"
        mime_msg["From"] = demo_address
        mime_msg["To"] = to
        # Use the original Message-ID for proper RFC2822 threading
        if message_id:
            mime_msg["In-Reply-To"] = message_id
            mime_msg["References"] = message_id
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


DEMO_EMAILS = [
    {
        "subject": "Payment Status Enquiry – INV-2024-1039 ($8,750.00) – Global Tech Parts",
        "from_name": "Global Tech Parts Billing",
        "from_addr": "billing@globaltechparts.com",
        "body": """Dear Accounts Payable Team,

I hope this message finds you well. I am writing to follow up on Invoice INV-2024-1039 submitted by Global Tech Parts for $8,750.00 against Purchase Order PO-8798.

Invoice Details:
  Invoice Number    : INV-2024-1039
  Supplier          : Global Tech Parts
  PO Number         : PO-8798
  Invoice Amount    : $8,750.00 USD
  Due Date          : 18 March 2024
  Payment Method    : Wire Transfer

Could you please confirm whether payment has been processed and, if so, share the transaction reference number?

Thank you for your assistance.

Best regards,
Accounts Receivable Team
Global Tech Parts
""",
    },
    {
        "subject": "OVERDUE PAYMENT – INV-2024-1042 ($12,500.00) – More Than 10 Days Past ETA",
        "from_name": "Acme Supplies Co",
        "from_addr": "ap@acmesupplies.com",
        "body": """Dear Team,

This is a follow-up regarding Invoice INV-2024-1042 from Acme Supplies Co, which remains unpaid and is now more than 10 days past its expected payment date.

Invoice Details:
  Invoice Number    : INV-2024-1042
  Supplier          : Acme Supplies Co
  PO Number         : PO-8821
  Invoice Amount    : $12,500.00 USD
  Due Date          : 25 March 2024
  Expected Payment  : 28 March 2024
  Payment Method    : ACH
  Current Status    : SCHEDULED (Overdue)

Despite the payment being scheduled via ACH on 28 March 2024, we have not received confirmation of funds clearing. It has now been more than 10 days beyond the expected payment date.

We urgently request:
  1. Confirmation of whether the ACH payment was successfully initiated
  2. The bank transaction reference number if payment was sent
  3. If payment was not processed, an updated ETA for clearance

Please treat this as an urgent matter to avoid further delays or late penalty charges as per our payment terms.

Best regards,
Accounts Payable Team
Acme Supplies Co
""",
    },
    {
        "subject": "Invoice INV-2024-1051 ($45,000.00) – Payment Status & Hold Explanation",
        "from_name": "Metro Office Solutions",
        "from_addr": "invoices@metroofficeinc.com",
        "body": """Dear Sookti.ai Accounts Payable,

We are writing regarding Invoice INV-2024-1051 for $45,000.00, which was submitted against Purchase Order PO-8834 and is now past its due date of 22 March 2024.

Invoice Details:
  Invoice Number    : INV-2024-1051
  Supplier          : Metro Office Solutions
  PO Number         : PO-8834
  Invoice Amount    : $45,000.00 USD
  Due Date          : 22 March 2024
  Payment Method    : ACH

We have not received payment or any communication regarding a delay. Could you please:
  1. Confirm the current payment status of this invoice
  2. If payment is on hold, advise the reason and the expected resolution date
  3. Confirm when we can expect payment to be released

Given the value of this invoice, we would appreciate a prompt response. Please escalate to your AP Manager if needed.

Kind regards,
Finance Team
Metro Office Solutions
""",
    },
    {
        "subject": "Short Payment Dispute – INV-2024-1038 – $450.00 Deduction Not Agreed",
        "from_name": "FastShip Logistics",
        "from_addr": "ar@fastshiplogistics.com",
        "body": """Dear Accounts Payable,

We are disputing a short payment received for Invoice INV-2024-1038.

Invoice Details:
  Invoice Number    : INV-2024-1038
  Supplier          : FastShip Logistics
  PO Number         : PO-8791
  Invoice Amount    : $3,200.00 USD
  Amount Received   : $2,750.00 USD
  Underpayment      : $450.00 USD
  Payment Date      : 15 March 2024
  Payment Method    : ACH

We received a payment of $2,750.00 on 15 March 2024; however, our invoice was for $3,200.00. The $450.00 deduction was not communicated to us in advance and we have not received any remittance advice explaining this deduction.

We request:
  1. A written explanation for the $450.00 deduction
  2. Supporting documentation or contract clause referenced for the deduction
  3. If the deduction is erroneous, payment of the outstanding $450.00

Please escalate this to your AP Manager as this requires review against our contractual terms.

Regards,
Accounts Receivable
FastShip Logistics
""",
    },
    {
        "subject": "General Payment Inquiry – Multiple Outstanding Invoices – Please Advise",
        "from_name": "Pinnacle Parts Ltd",
        "from_addr": "finance@pinnacleparts.com",
        "body": """Dear Sookti.ai Finance Team,

I hope you are well. I am reaching out on behalf of Pinnacle Parts Ltd to enquire about the status of several invoices that we believe are now approaching or past their due dates.

We currently have the following outstanding with your organisation:
  - INV-PP-2024-0091: $6,400.00 — Due 20 March 2024
  - INV-PP-2024-0095: $11,200.00 — Due 28 March 2024
  - INV-PP-2024-0101: $4,750.00 — Due 1 April 2024

Could you please:
  1. Confirm whether these invoices have been received and approved in your system
  2. Advise the expected payment date for each
  3. Let us know if any additional documentation is required from our side

We value our relationship with Sookti.ai and would appreciate a timely update. Please feel free to reach out if you have any questions.

Warm regards,
Finance Department
Pinnacle Parts Ltd
""",
    },
]


async def inject_demo_emails():
    """
    Insert 5 demo supplier emails directly into the monitored inbox as unread messages.
    Uses the Gmail API messages.insert method so no actual sending is required.
    Returns the count of emails successfully injected.
    """
    try:
        service = get_service()
        demo_address = os.getenv("GMAIL_DEMO_ADDRESS", "")
        count = 0

        for draft in DEMO_EMAILS:
            mime_msg = MIMEMultipart("alternative")
            mime_msg["Subject"] = draft["subject"]
            mime_msg["From"] = f"{draft['from_name']} <{draft['from_addr']}>"
            mime_msg["To"] = demo_address
            mime_msg.attach(MIMEText(draft["body"], "plain"))

            raw = base64.urlsafe_b64encode(mime_msg.as_bytes()).decode("utf-8")
            service.users().messages().insert(
                userId="me",
                body={"raw": raw, "labelIds": ["INBOX", "UNREAD"]},
            ).execute()
            count += 1

        return count

    except HttpError as e:
        print(f"Gmail inject error: {e}")
        raise
    except Exception as e:
        print(f"Gmail inject error: {e}")
        raise


def is_connected() -> bool:
    """Check whether Gmail credentials are configured and usable."""
    try:
        service = get_service()
        service.users().getProfile(userId="me").execute()
        return True
    except Exception:
        return False
