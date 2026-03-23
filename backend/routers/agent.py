import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import claude_service

router = APIRouter()

AUDIT_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "audit_log.json")


class ClassifyIntentRequest(BaseModel):
    email_subject: str
    email_body: str


class GenerateResponseRequest(BaseModel):
    inquiry: str
    erp_data: dict
    policies: list


class MapWorkflowRequest(BaseModel):
    description: str


class ExtractPoliciesRequest(BaseModel):
    description: str
    existing_policies: list = []


@router.post("/classify-intent")
def classify_intent(req: ClassifyIntentRequest):
    try:
        result = claude_service.classify_intent(req.email_subject, req.email_body)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-response")
def generate_response(req: GenerateResponseRequest):
    try:
        result = claude_service.generate_response(req.inquiry, req.erp_data, req.policies)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/map-workflow")
def map_workflow(req: MapWorkflowRequest):
    try:
        result = claude_service.map_workflow(req.description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-policies")
def extract_policies(req: ExtractPoliciesRequest):
    try:
        result = claude_service.extract_policies(req.description, req.existing_policies)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
def get_suggestions():
    try:
        with open(AUDIT_LOG_PATH) as f:
            audit_log = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        audit_log = []

    if len(audit_log) < 3:
        return {"suggestions": []}

    try:
        result = claude_service.generate_suggestions(audit_log)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
