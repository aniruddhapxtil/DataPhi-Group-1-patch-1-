# app/chats/deps.py
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import ChatSession

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_chat_session(chat_id: int, db: Session = Depends(get_db)) -> ChatSession:
    chat = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return chat
