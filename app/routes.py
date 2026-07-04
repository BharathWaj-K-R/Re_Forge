from fastapi import APIRouter
from pydantic import BaseModel

from app.ai import review_code
from app.agents.orchestrator import review

router = APIRouter()


class ReviewRequest(BaseModel):
    language: str
    code: str


@router.get("/")
def home():
    return {
        "success": True,
        "message": "Welcome to ReForge API 🚀"
    }


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ReForge API",
        "version": "1.0.0"
    }


@router.get("/test-ai")
def test_ai():

    result = review_code(
        language="python",
        code="print('Hello ReForge')"
    )

    return {
        "success": True,
        "result": result
    }


@router.post("/review")
def review_endpoint(request: ReviewRequest):

    return review(
        code=request.code,
        language=request.language
    )