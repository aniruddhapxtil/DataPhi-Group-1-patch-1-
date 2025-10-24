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
    """
    Fetches the complete token usage history for ALL users.
    This endpoint is protected and only accessible by users with the 'admin' role.
    """
    data = db.query(TokenUsage).all()
    
    # The response is a list of dictionaries, now including the 'cost' field.
    return [
        {
            "user_id": row.user_id,
            "timestamp": row.timestamp,
            "model": row.model_name,
            "user_query": row.user_query,
            "prompt_tokens": row.prompt_tokens,
            "response_tokens": row.response_tokens,
            "total_tokens": row.total_tokens,
            "cost": row.cost, # ✅ Return the cost for each transaction
        }
        for row in data
    ]

