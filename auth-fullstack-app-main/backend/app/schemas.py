# backend/app/schemas.py

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
# ✅ Corrected imports for wider compatibility
from typing import List, Dict, Any, Optional

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
    # ✅ Corrected: Changed 'str | None' to 'Optional[str]'
    email: Optional[str] = None

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
    # ✅ Corrected: Changed 'list[MessageOut]' to 'List[MessageOut]'
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True

# ----- ✅ NEW STREAMING PAYLOAD SCHEMAS -----
# These models define the structure for the different types of messages
# we will stream to the frontend.

class TextPayload(BaseModel):
    """Schema for a simple text payload."""
    type: str = "text"
    content: str

class ChartPayload(BaseModel):
    """Schema for a chart/visualization payload."""
    type: str = "chart"
    chart_type: str = "bar"
    data: Dict[str, Any] = Field(..., example={"title": "Quarterly Sales", "labels": ["Q1", "Q2", "Q3"], "values": [100, 150, 120]})