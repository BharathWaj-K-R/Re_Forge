import os
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.email_service import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Config ---
JWT_SECRET = os.getenv("JWT_SECRET", "reforge-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # 24 hours

# --- Password hashing ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def generate_otp() -> str:
    """Generate 6-digit numeric OTP."""
    return str(random.randint(100000, 999999))

# --- OAuth2 scheme ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# --- Pydantic schemas ---
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class VerifyOtpRequest(BaseModel):
    email: str
    otp: str


class ResendOtpRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime


# --- Helpers ---
def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Returns the current user if a valid token is provided, else None."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


def require_user(user: User | None = Depends(get_current_user)) -> User:
    """FastAPI dependency that raises 401 if no valid user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# --- Endpoints ---
@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=req.email,
        name=req.name,
        hashed_password=hash_password(req.password),
        is_verified=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate and send OTP
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    user.otp_sent_at = datetime.now(timezone.utc)
    db.commit()

    send_otp_email(user.email, otp, purpose="verify")

    return {
        "success": True,
        "message": "Verification code sent",
        "email": user.email,
    }


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
        )

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={"id": user.id, "email": user.email, "name": user.name},
    )


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(require_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
    )


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified",
        )

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP not sent or expired",
        )

    if datetime.now(timezone.utc) > user.otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired",
        )

    if user.otp_code != req.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    user.is_verified = 1
    user.otp_code = None
    user.otp_expires_at = None
    user.otp_sent_at = None
    db.commit()

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={"id": user.id, "email": user.email, "name": user.name},
    )


@router.post("/resend-otp")
def resend_otp(req: ResendOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified",
        )

    # Rate limit: 60 seconds between OTP sends
    if user.otp_sent_at:
        elapsed = (datetime.now(timezone.utc) - user.otp_sent_at).total_seconds()
        if elapsed < 60:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(60 - elapsed)} seconds before requesting a new OTP",
            )

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    user.otp_sent_at = datetime.now(timezone.utc)
    db.commit()

    send_otp_email(user.email, otp, purpose="verify")

    return {
        "success": True,
        "message": "Verification code resent",
    }


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    
    # Always return generic response to prevent email enumeration
    if not user:
        return {
            "success": True,
            "message": "If the email exists, a reset code has been sent",
        }

    # Rate limit: 60 seconds between OTP sends
    if user.otp_sent_at:
        elapsed = (datetime.now(timezone.utc) - user.otp_sent_at).total_seconds()
        if elapsed < 60:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(60 - elapsed)} seconds before requesting a new code",
            )

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    user.otp_sent_at = datetime.now(timezone.utc)
    db.commit()

    send_otp_email(user.email, otp, purpose="reset")

    return {
        "success": True,
        "message": "If the email exists, a reset code has been sent",
    }


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code not sent or expired",
        )

    if datetime.now(timezone.utc) > user.otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code expired",
        )

    if user.otp_code != req.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset code",
        )

    user.hashed_password = hash_password(req.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    user.otp_sent_at = None
    db.commit()

    return {
        "success": True,
        "message": "Password reset successfully",
    }
