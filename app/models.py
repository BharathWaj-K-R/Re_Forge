from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "reforge_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
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
