from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from backend.routes import router

load_dotenv()

app = FastAPI(
    title="ReForge API",
    description="ReForge - Multi-Agent Code Reviewer",
    version="1.1.0",
)

_extra_origins = [
    origin.strip()
    for origin in os.getenv("NEW_FRONTEND_URL", "").split(",")
    if origin.strip()
]

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    *_extra_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
