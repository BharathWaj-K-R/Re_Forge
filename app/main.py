from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from app.routes import router

load_dotenv()

app = FastAPI(
    title="ReForge API",
    description="ReForge - Multi-Agent Code Reviewer",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://reforge-client.onrender.com",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
from fastapi import FastAPI
from app.routes import router

app = FastAPI(
    title="ReForge API",
    description="ReForge - Multi-Agent Code Reviewer",
    version="1.0.0"
)

app.include_router(router)