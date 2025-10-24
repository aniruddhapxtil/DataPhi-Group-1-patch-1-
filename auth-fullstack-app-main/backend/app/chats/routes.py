from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
import json
import asyncio

from sqlalchemy.orm import Session
from sqlalchemy import desc
from app import models, schemas
from app.database import get_db, SessionLocal
from app.auth.deps import get_current_user, get_current_user_from_query, get_current_admin_user
from app.models import User, TokenUsage

router = APIRouter(
    prefix="/chats",
    tags=["chats"]
)

# ✅ Define your model costs here at the top of the file
MODEL_COSTS = {
    "gpt-3.5": 0.005  # Example: $0.005 per token
    # You can add other models and their costs here in the future
}

# --- All synchronous endpoints like /create, /latest, etc., remain unchanged ---
@router.post("/", response_model=schemas.ChatSessionOut)
def create_chat(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_chat = models.ChatSession(title="New Chat", user_id=current_user.id)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return schemas.ChatSessionOut(id=db_chat.id, title=db_chat.title, created_at=db_chat.created_at, messages=[])

@router.get("/latest", response_model=schemas.ChatSessionOut)
def get_latest_chat(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    latest_chat = db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).order_by(desc(models.ChatSession.created_at)).first()
    if not latest_chat:
        raise HTTPException(status_code=404, detail="No chat sessions found")
    return latest_chat

@router.get("/all", response_model=list[schemas.ChatSessionOut])
def get_all_chats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chats = db.query(models.ChatSession).filter(models.ChatSession.user_id == current_user.id).order_by(desc(models.ChatSession.created_at)).all()
    return chats

@router.get("/{chat_id}/messages", response_model=list[schemas.MessageOut])
def get_messages(chat_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    chat = db.query(models.ChatSession).filter(models.ChatSession.id == chat_id, models.ChatSession.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found or you don't have permission")
    messages = db.query(models.Message).filter(models.Message.chat_id == chat_id).all()
    return messages

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

# ✅ UPDATE the streaming generator to include cost calculation
async def real_time_response_generator(chat_id: int, user_message: str, current_user_id: int):
    
    model_name = "gpt-3.5" # Hardcoded for now, could be dynamic later
    cost_per_token = MODEL_COSTS.get(model_name, 0) # Safely get the cost, default to 0

    def save_message_in_thread(content: str, role: str):
        # ... (this function is the same)
        db = SessionLocal()
        try:
            db_message = models.Message(content=content, role=role, chat_id=chat_id)
            db.add(db_message)
            db.commit()
        finally:
            db.close()

    await run_in_threadpool(save_message_in_thread, content=user_message, role='user')
    
    prompt_tokens = len(user_message.split())
    full_text_response = f"Certainly. I am processing your request for '{user_message}'. Here is a real-time streamed response, word by word."
    
    response_tokens = len(full_text_response.split())
    total_tokens = prompt_tokens + response_tokens
    
    # Calculate the cost for this specific interaction
    transaction_cost = total_tokens * cost_per_token

    def save_token_usage():
        db = SessionLocal()
        try:
            db_token = models.TokenUsage(
                user_id=current_user_id,
                model_name=model_name,
                user_query=user_message,
                prompt_tokens=prompt_tokens,
                response_tokens=response_tokens,
                total_tokens=total_tokens,
                cost=transaction_cost  # Save the calculated cost to the database
            )
            db.add(db_token)
            db.commit()
        finally:
            db.close()
            
    await run_in_threadpool(save_token_usage)

    # ... (The rest of the streaming logic remains the same)
    for word in full_text_response.split():
        text_chunk = schemas.TextChunkPayload(content=f" {word}")
        yield f"event: text_chunk\ndata: {json.dumps(text_chunk.dict())}\n\n"
        await asyncio.sleep(0.05)

    await run_in_threadpool(save_message_in_thread, content=full_text_response, role='assistant')
    await asyncio.sleep(1.5)

    chart_data = schemas.ChartPayload(data={"title": "Quarterly Sales Data (Live)","labels": ["July", "August", "September"],"values": [150, 220, 300]})
    yield f"event: chart_payload\ndata: {json.dumps(chart_data.dict())}\n\n"

    chart_message_content = json.dumps(chart_data.dict())
    await run_in_threadpool(save_message_in_thread, content=chart_message_content, role='assistant')

    yield "event: end_stream\ndata: {}\n\n"


@router.get("/{chat_id}/stream")
async def stream_real_time_message(
    chat_id: int,
    prompt: str,
    current_user: User = Depends(get_current_user_from_query)
):
    # ... (This endpoint remains the same)
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    generator = real_time_response_generator(chat_id, prompt, current_user.id)
    return StreamingResponse(generator, media_type="text/event-stream")

# ✅ UPDATE the user token usage endpoint to return the new cost field
@router.get("/user/token-usage")
def get_user_token_usage(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    data = db.query(models.TokenUsage).filter(models.TokenUsage.user_id == current_user.id).all()
    return [
        {
            "user_id": row.user_id,
            "timestamp": row.timestamp,
            "model": row.model_name,
            "user_query": row.user_query,
            "prompt_tokens": row.prompt_tokens,
            "response_tokens": row.response_tokens,
            "total_tokens": row.total_tokens,
            "cost": row.cost, # Return the cost
        }
        for row in data
    ]

# The admin endpoint is in a different file (admin/routes.py) and will be updated next.

