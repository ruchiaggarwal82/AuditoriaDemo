# Auditoria Digital Worker Demo

A prototype demonstrating an AI-powered platform for enterprise finance digital workers.

## What this demonstrates
- Admin portal for configuring digital workers via plain English
- Live Gmail integration for supplier payment inquiries
- Autonomous response generation using Claude AI
- Slack escalation for exceptions requiring human review
- Audit trail with feedback loop for continuous improvement

## Architecture
- **Backend**: FastAPI + Python, Claude (claude-sonnet-4-20250514), Gmail API, Slack Webhooks
- **Frontend**: React 18 + Vite + Tailwind CSS (Phase 2)
- **Data**: Simulated ERP data in JSON; audit log persisted locally

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
uvicorn main:app --reload --port 8000
```

### Environment Variables (backend/.env)
```
ANTHROPIC_API_KEY=sk-ant-...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_DEMO_ADDRESS=ruchikumar111982@gmail.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Getting Gmail credentials
1. Go to Google Cloud Console → create project "AuditoriaDemo"
2. Enable Gmail API
3. Create OAuth 2.0 credentials (Desktop App type)
4. Run the auth script: `python scripts/gmail_auth.py`
5. Copy the refresh token printed to `.env`

## Demo flow
See the full demo script in the spec. Total runtime: 10-12 minutes.
