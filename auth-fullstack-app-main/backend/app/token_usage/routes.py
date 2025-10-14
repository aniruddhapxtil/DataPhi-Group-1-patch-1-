from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import TokenUsage, User
from app.auth.deps import get_current_user

router = APIRouter(
    prefix="/token-usage",
    tags=["token-usage"]
)

# Admin: all users usage
@router.get("/all")
def get_all_token_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only allow admin
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Get all token usage entries
    usage_history = db.query(TokenUsage).order_by(TokenUsage.timestamp.desc()).all()
    return usage_history
