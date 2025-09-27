from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Dict, Any

# ----- Auth -----
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class ChangePasswordRequest(BaseModel):
    email: str
    old_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# ----- Chat -----
class ChatUpdate(BaseModel):
    title: str

class MessageCreate(BaseModel):
    content: str
    role: str

class MessageOut(BaseModel):
    id: int
    content: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: list[MessageOut] = []

    class Config:
        from_attributes = True

# ----- STREAMING PAYLOAD SCHEMAS -----

class TextChunkPayload(BaseModel):
    """Schema for a single chunk of streaming text."""
    type: str = "text_chunk"
    content: str

class TextPayload(BaseModel):
    """Schema for a simple text payload."""
    type: str = "text"
    content: str

class ChartPayload(BaseModel):
    """Schema for a chart/visualization payload."""
    type: str = "chart"
    chart_type: str = "bar"
    data: Dict[str, Any] = Field(..., example={"title": "Quarterly Sales", "labels": ["Q1", "Q2", "Q3"], "values": [100, 150, 120]})
