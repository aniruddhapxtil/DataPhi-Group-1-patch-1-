from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import secrets
import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

# --- JWT and Password Hashing Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

'''def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)'''
# ✅ UPDATED ACCESS TOKEN (supports custom expiry)
def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Enhanced create_access_token to allow custom expiry time (e.g., 1 hour for admin).
    Keeps compatibility with old logic.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
# --- Password Reset Token Configuration ---
def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

def is_token_valid(token_expires: datetime) -> bool:
    return datetime.utcnow() < token_expires

# --- Email Configuration ---
# Setting default values to prevent startup crashes if env variables are not found
conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "default_username"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "default_password"),
    MAIL_FROM = os.getenv("MAIL_FROM", "default_email@example.com"),
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.example.com"),
    MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Default App Name"),
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

async def send_reset_password_email(user_email: str, token: str):
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    html_content = f"""
    <h3>Password Reset</h3>
    <p>Please use the following link to reset your password:</p>
    <a href="{reset_link}">Reset Password</a>
    <p>This link will expire in 15 minutes.</p>
    """
    message = MessageSchema(
        subject="Password Reset Request",
        recipients=[user_email],
        body=html_content,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)
