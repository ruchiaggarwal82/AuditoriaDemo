"""
Run this script ONCE to get your Gmail refresh token.

Usage:
  python scripts/gmail_auth.py

It will open a browser for OAuth consent. After approval it prints
the refresh token — copy it into backend/.env as GMAIL_REFRESH_TOKEN.

Prerequisites:
  - Download OAuth 2.0 credentials JSON from Google Cloud Console
  - Save it as backend/credentials.json
  - credentials.json is in .gitignore — never commit it
"""

import json
import os
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "..", "credentials.json")


def main():
    if not os.path.exists(CREDENTIALS_FILE):
        print("ERROR: credentials.json not found.")
        print("Download it from Google Cloud Console → APIs & Services → Credentials")
        print(f"Save it to: {os.path.abspath(CREDENTIALS_FILE)}")
        return

    flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    print("\n✅ Auth successful!\n")
    print("Add these to backend/.env:\n")
    print(f"GMAIL_CLIENT_ID={creds.client_id}")
    print(f"GMAIL_CLIENT_SECRET={creds.client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={creds.refresh_token}")
    print("\nDo NOT commit credentials.json or .env to git.")


if __name__ == "__main__":
    main()
