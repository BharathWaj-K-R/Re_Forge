from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    __tablename__ = "reforge_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Integer, default=0)  # 0=False, 1=True
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    otp_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reforge_reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("reforge_users.id"), nullable=False)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    overall_score = Column(Float, nullable=False)
    summary = Column(Text, default="")
    reviews_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="reviews")
