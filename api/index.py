from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from api.audit_pipeline import clean_and_audit_cards

app = FastAPI(title="VC Pro Stage 2 Data Audit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CardInput(BaseModel):
    name: Optional[str] = ""
    title: Optional[str] = ""
    company: Optional[str] = ""
    email: Optional[str] = ""
    mobile: Optional[str] = ""
    landline: Optional[str] = ""
    website: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    country: Optional[str] = ""
    notes: Optional[str] = ""

class AuditRequest(BaseModel):
    cards: List[CardInput]

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "VC Pro Audit Backend", "engine": "Pandas Python Data Auditor"}

@app.post("/api/audit")
def audit_cards(payload: AuditRequest):
    try:
        cards_dict = [card.model_dump() for card in payload.cards]
        result = clean_and_audit_cards(cards_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
