from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_user
from backend.database import get_db
from backend.models import User, Review
from backend.review_pipeline.pipeline import review

router = APIRouter()


class ReviewRequest(BaseModel):
    language: str
    code: str


@router.get("/")
def home():
    return {"success": True, "message": "Welcome to ReForge API"}


@router.get("/health")
def health():
    return {"status": "healthy", "service": "ReForge API", "version": "1.0.0"}


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
def review_endpoint(
    request: ReviewRequest,
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = review(code=request.code, language=request.language)

    if current_user and result.get("success"):
        record = Review(
            user_id=current_user.id,
            language=request.language,
            code=request.code,
            overall_score=result.get("overall_score", 0),
            summary=result.get("summary", ""),
            reviews_data=result.get("reviews", {}),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        result["review_id"] = record.id

    return result


@router.get("/history")
def get_history(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    reviews = (
        db.query(Review)
        .filter(Review.user_id == user.id)
        .order_by(Review.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(reviews),
        "reviews": [
            {
                "id": item.id,
                "language": item.language,
                "overall_score": item.overall_score,
                "summary": item.summary,
                "created_at": item.created_at.isoformat()
                if item.created_at
                else None,
            }
            for item in reviews
        ],
    }


@router.get("/history/{review_id}")
def get_review_detail(
    review_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(Review)
        .filter(Review.id == review_id, Review.user_id == user.id)
        .first()
    )

    if not record:
        return {"success": False, "message": "Review not found"}

    return {
        "success": True,
        "review": {
            "id": record.id,
            "language": record.language,
            "code": record.code,
            "overall_score": record.overall_score,
            "summary": record.summary,
            "reviews": record.reviews_data,
            "created_at": record.created_at.isoformat()
            if record.created_at
            else None,
        },
    }


@router.delete("/history")
def clear_history(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    deleted = db.query(Review).filter(Review.user_id == user.id).delete()
    db.commit()

    return {"success": True, "message": f"Deleted {deleted} review(s)"}


@router.delete("/account")
def delete_account(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    db.query(Review).filter(Review.user_id == user.id).delete()
    db.delete(user)
    db.commit()

    return {"success": True, "message": "Account deleted successfully"}
