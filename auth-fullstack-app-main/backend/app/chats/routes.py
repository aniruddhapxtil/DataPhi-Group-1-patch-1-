# backend/app/chats/routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
# ✅ Add run_in_threadpool for handling blocking I/O
from fastapi.concurrency import run_in_threadpool
import json
import asyncio

from sqlalchemy.orm import Session
from sqlalchemy import desc
from app import models, schemas
# ✅ Import SessionLocal to create new sessions in threads
from app.database import get_db, SessionLocal
from app.auth.deps import get_current_user


router = APIRouter(tags=["chats"])

# --- EXISTING ENDPOINTS (UNCHANGED) ---
# ... (all your existing synchronous endpoints are fine as they are) ...

# Endpoint to create a new chat session
@router.post("/", response_model=schemas.ChatSessionOut)
def create_chat(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_chat = models.ChatSession(title="New Chat", user_id=current_user.id)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return schemas.ChatSessionOut(
        id=db_chat.id, 
        title=db_chat.title, 
        created_at=db_chat.created_at, 
        messages=[]
    )

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
    return chats

# Endpoint to get messages for a specific chat
@router.get("/{chat_id}/messages", response_model=list[schemas.MessageOut])
def get_messages(chat_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat = db.query(models.ChatSession).filter(models.ChatSession.id == chat_id, models.ChatSession.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found or you don't have permission")
    
    messages = db.query(models.Message).filter(models.Message.chat_id == chat_id).all()
    return messages

# This endpoint is now replaced by the streaming endpoint for new messages
# You can keep it for other purposes or remove it if it's no longer needed.
@router.post("/{chat_id}/messages", response_model=schemas.MessageOut, deprecated=True)
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

# --- ✅ CORRECTED STREAMING ENDPOINT AND LOGIC ---

async def multi_payload_response_generator(chat_id: int, user_message: str):
    """
    This is a corrected async generator. It uses synchronous, thread-safe sub-functions
    for all database operations to avoid blocking the main event loop.
    """
    
    # Define a synchronous function to save the user message.
    def save_user_message_sync():
        db = SessionLocal()  # Create a new session for this thread
        try:
            user_db_message = models.Message(content=user_message, role='user', chat_id=chat_id)
            db.add(user_db_message)
            db.commit()
        finally:
            db.close()

    # Run the blocking DB code in a thread
    await run_in_threadpool(save_user_message_sync)

    # --- First Payload: The initial text response ---
    text_content = f"Understood. I am generating a sales data visualization based on your request: '{user_message}'..."
    text_response = schemas.TextPayload(content=text_content)
    yield f"data: {json.dumps(text_response.dict())}\n\n"

    # Define a sync function to save the text response.
    def save_assistant_text_message_sync():
        db = SessionLocal()
        try:
            assistant_text_db_message = models.Message(content=text_content, role='assistant', chat_id=chat_id)
            db.add(assistant_text_db_message)
            db.commit()
        finally:
            db.close()

    await run_in_threadpool(save_assistant_text_message_sync)
    
    # --- Simulate non-blocking work ---
    await asyncio.sleep(2)

    # --- Second Payload: The visualization data ---
    chart_data = schemas.ChartPayload(
        data={
            "title": "Quarterly Sales Data",
            "labels": ["July", "August", "September"],
            "values": [150, 220, 300]
        }
    )
    yield f"data: {json.dumps(chart_data.dict())}\n\n"

    # Define a sync function to save the chart data.
    def save_assistant_chart_message_sync():
        db = SessionLocal()
        try:
            chart_message_content = json.dumps(chart_data.dict()) # Use dict() then json.dumps
            assistant_chart_db_message = models.Message(content=chart_message_content, role='assistant', chat_id=chat_id)
            db.add(assistant_chart_db_message)
            db.commit()
        finally:
            db.close()

    await run_in_threadpool(save_assistant_chart_message_sync)


@router.post("/{chat_id}/stream", status_code=status.HTTP_200_OK)
async def stream_multi_payload_message(
    chat_id: int,
    message: schemas.MessageCreate,
    # We still need get_db to verify ownership synchronously first
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    This endpoint initiates the streaming response. It replaces the old POST messages endpoint.
    The initial ownership check is still a blocking operation.
    """
    chat = db.query(models.ChatSession).filter(models.ChatSession.id == chat_id, models.ChatSession.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found or you don't have permission")

    # The generator function no longer needs the 'db' session passed to it
    return StreamingResponse(
        multi_payload_response_generator(chat_id, message.content),
        media_type="text/event-stream"
    )