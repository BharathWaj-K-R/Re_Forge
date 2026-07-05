from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai import review_code
from app.agents.orchestrator import review
from app.auth import get_current_user
from app.database import get_db
from app.models import User, Review

router = APIRouter()


class ReviewRequest(BaseModel):
    language: str
    code: str


@router.get("/")
def home():
    return {
        "success": True,
        "message": "Welcome to ReForge API"
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
def review_endpoint(
    request: ReviewRequest,
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    result = review(
        code=request.code,
        language=request.language
    )

    # Save to history if user is authenticated
    if current_user and result.get("success"):
        review_record = Review(
            user_id=current_user.id,
            language=request.language,
            code=request.code,
            overall_score=result.get("overall_score", 0),
            summary=result.get("summary", ""),
            reviews_data=result.get("reviews", {}),
        )
        db.add(review_record)
        db.commit()
        db.refresh(review_record)
        result["review_id"] = review_record.id

    return result


@router.get("/history")
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's review history."""
    from app.auth import require_user
    user = require_user(current_user)

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
                "id": r.id,
                "language": r.language,
                "overall_score": r.overall_score,
                "summary": r.summary,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reviews
        ],
    }


@router.get("/history/{review_id}")
def get_review_detail(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return full detail of a single review."""
    from app.auth import require_user
    user = require_user(current_user)

    review_record = (
        db.query(Review)
        .filter(Review.id == review_id, Review.user_id == user.id)
        .first()
    )

    if not review_record:
        return {"success": False, "message": "Review not found"}

    return {
        "success": True,
        "review": {
            "id": review_record.id,
            "language": review_record.language,
            "code": review_record.code,
            "overall_score": review_record.overall_score,
            "summary": review_record.summary,
            "reviews": review_record.reviews_data,
            "created_at": review_record.created_at.isoformat() if review_record.created_at else None,
        },
    }