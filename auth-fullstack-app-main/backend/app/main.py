from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.routes import router as auth_router
from app.chats.routes import router as chats_router
from app.admin.routes import router as admin_router
from app.token_usage.routes import router as token_router



app = FastAPI()
app.router.redirect_slashes = True  # auto-redirect /chats → /chats/
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#app.include_router(auth_router, prefix="/auth", tags=["auth"])
#app.include_router(chats_router, prefix="/chats")
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(chats_router)
app.include_router(admin_router)
app.include_router(token_router)
