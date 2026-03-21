from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import agent, email_poller, workflow, policies, audit, dashboard

app = FastAPI(title="Auditoria Demo API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router, prefix="/api/agent")
app.include_router(email_poller.router, prefix="/api/email")
app.include_router(workflow.router, prefix="/api/workflow")
app.include_router(policies.router, prefix="/api/policies")
app.include_router(audit.router, prefix="/api/audit")
app.include_router(dashboard.router, prefix="/api/dashboard")


@app.get("/")
def root():
    return {"status": "ok", "service": "Auditoria Demo API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
