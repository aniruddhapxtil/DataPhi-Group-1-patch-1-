# ✅ FIXED: app/auth/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
import os

from .. import models, schemas
from ..database import get_db
from .utils import hash_password, verify_password, create_access_token, generate_reset_token, is_token_valid, send_reset_password_email
from .deps import get_current_user
from passlib.context import CryptContext
from ..schemas import ChangePasswordRequest

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

# The placeholder function is now removed.
# The actual send_reset_password_email function is imported from utils.py

@router.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User registered successfully"}

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        return {"message": "If a user with that email exists, a password reset email has been sent."}

    token = generate_reset_token()
    token_expires = datetime.utcnow() + timedelta(minutes=15)

    user.reset_token = token
    user.reset_token_expires = token_expires
    db.commit()

    # The correct function call is now awaited
    await send_reset_password_email(user.email, token)

    return {"message": "If a user with that email exists, a password reset email has been sent."}

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == request.token).first()

    if not user or not is_token_valid(user.reset_token_expires):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token.")

    user.hashed_password = pwd_context.hash(request.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password has been successfully reset."}

@router.post("/change-password")
def change_password(data: schemas.ChangePasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not pwd_context.verify(data.old_password, user.hashed_password):
        raise HTTPException(status_code=403, detail="Old password is incorrect")

    user.hashed_password = pwd_context.hash(data.new_password)
    db.commit()
    return {"message": "You have successfully changed your password. Please log in again."}