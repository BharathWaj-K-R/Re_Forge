from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from backend.routes import router
from backend.auth import router as auth_router
from backend.database import engine, Base

load_dotenv()

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ReForge API",
    description="ReForge - Multi-Agent Code Reviewer",
    version="1.0.0"
)

# CORS configuration
# NEW_FRONTEND_URL can be a single origin or a comma-separated list, so
# multiple deploys (prod, previews, local dev) can all reach the API
# without needing a redeploy every time a frontend URL changes.
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)
