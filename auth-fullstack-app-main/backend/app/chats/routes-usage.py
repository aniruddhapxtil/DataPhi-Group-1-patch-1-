# backend/app/chats/routes_usage.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.deps import get_current_user
from app import models
from fastapi.responses import StreamingResponse
from io import StringIO
import csv
from datetime import datetime

router = APIRouter(tags=["token_usage"])

@router.get("/token-usage/me")
def get_user_token_usage(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    records = db.query(models.TokenUsage).filter(models.TokenUsage.user_id == current_user.id).order_by(models.TokenUsage.timestamp.desc()).all()
    return [
        {
            "id": r.id,
            "prompt_tokens": r.prompt_tokens,
            "response_tokens": r.response_tokens,
            "total_tokens": r.total_tokens,
            "timestamp": r.timestamp,
        }
        for r in records
    ]


@router.get("/token-usage/all")
def get_all_token_usage(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access forbidden: Admins only.")
    records = db.query(models.TokenUsage).order_by(models.TokenUsage.timestamp.desc()).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "prompt_tokens": r.prompt_tokens,
            "response_tokens": r.response_tokens,
            "total_tokens": r.total_tokens,
            "timestamp": r.timestamp,
        }
        for r in records
    ]


@router.get("/token-usage/export")
def export_token_usage_csv(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only.")

    records = db.query(models.TokenUsage).order_by(models.TokenUsage.timestamp.desc()).all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User ID", "Prompt Tokens", "Response Tokens", "Total Tokens", "Timestamp"])
    for r in records:
        writer.writerow([r.id, r.user_id, r.prompt_tokens, r.response_tokens, r.total_tokens, r.timestamp])

    output.seek(0)
    filename = f"token_usage_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})
