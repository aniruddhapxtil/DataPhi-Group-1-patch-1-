from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.deps import get_current_admin_user
from app.models import TokenUsage

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

@router.get("/token-usage")
def get_all_token_usage(db: Session = Depends(get_db), current_user=Depends(get_current_admin_user)):
    data = db.query(TokenUsage).all()
    return [
        {
            "user_id": row.user_id,
            "timestamp": row.timestamp,
            "model": row.model_name,
            "user_query": row.user_query,
            "prompt_tokens": row.prompt_tokens,
            "response_tokens": row.response_tokens,
            "total_tokens": row.total_tokens,
        }
        for row in data
    ]
