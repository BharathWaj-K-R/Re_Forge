from fastapi import APIRouter
from pydantic import BaseModel

from backend.review_pipeline.pipeline import review

router = APIRouter()


class ReviewRequest(BaseModel):
    language: str
    code: str


@router.get("/")
def home():
    return {
        "success": True,
        "service": "ReForge API",
        "message": "Welcome to ReForge",
        "mode": "public",
    }


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "ReForge API",
        "version": "1.1.0",
        "mode": "public",
    }


@router.get("/test-ai")
def test_ai():
    from backend.ai import call_llm

    try:
        result = call_llm(
            system_prompt="You are a test assistant.",
            user_prompt="Say hello in one word.",
            response_format="text",
        )
        return {"success": True, "result": result}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/review")
def review_endpoint(request: ReviewRequest):
    return review(code=request.code, language=request.language)
