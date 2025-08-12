# backend/app/chats/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.auth.deps import get_current_user
from sqlalchemy import desc

router = APIRouter(tags=["chats"]) # Removed the prefix here

# Endpoint to create a new chat session
@router.post("/", response_model=schemas.ChatSessionOut)
def create_chat(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_chat = models.ChatSession(title="New Chat", user_id=current_user.id)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return schemas.ChatSessionOut(id=db_chat.id, title=db_chat.title, created_at=db_chat.created_at)

# Endpoint to get the latest chat session
@router.get("/latest", response_model=schemas.ChatSessionOut)
def get_latest_chat(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    latest_chat = db.query(models.ChatSession)\
                    .filter(models.ChatSession.user_id == current_user.id)\
                    .order_by(desc(models.ChatSession.created_at))\
                    .first()
    if not latest_chat:
        raise HTTPException(status_code=404, detail="No chat sessions found")
    
    return latest_chat

# Endpoint to get ALL chat sessions
@router.get("/all", response_model=list[schemas.ChatSessionOut])
def get_all_chats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chats = db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).order_by(desc(models.ChatSession.created_at)).all()
    if not chats:
        raise HTTPException(status_code=404, detail="No chat sessions found")
    return chats

# Endpoint to get messages for a specific chat
@router.get("/{chat_id}/messages", response_model=list[schemas.MessageOut])
def get_messages(chat_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    messages = db.query(models.Message).filter(models.Message.chat_id == chat_id).all()
    return messages

# Endpoint to add a message to a chat session
@router.post("/{chat_id}/messages", response_model=schemas.MessageOut)
def create_message(chat_id: int, message: schemas.MessageCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat_session = db.query(models.ChatSession).filter(models.ChatSession.id == chat_id, models.ChatSession.user_id == current_user.id).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    db_message = models.Message(content=message.content, role=message.role, chat_id=chat_id)
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    ai_response_content = f"I received your message: '{message.content}'. I am an AI assistant and will respond soon."
    ai_response = models.Message(content=ai_response_content, role='assistant', chat_id=chat_id)
    db.add(ai_response)
    db.commit()
    db.refresh(ai_response)

    return db_message

# Endpoint to delete a chat session
@router.delete("/{chat_id}")
def delete_chat(chat_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat = db.query(models.ChatSession).filter(models.ChatSession.id == chat_id, models.ChatSession.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat)
    db.commit()
    return {"detail": "Chat deleted"}

@router.patch("/{chat_id}", response_model=schemas.ChatSessionOut)
def update_chat_title(chat_id: int, chat_update: schemas.ChatUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat = db.query(models.ChatSession).filter(models.ChatSession.id == chat_id, models.ChatSession.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat.title = chat_update.title
    db.commit()
    db.refresh(chat)
    return chat