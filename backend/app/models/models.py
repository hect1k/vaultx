import datetime
import uuid
from typing import List, Optional

from pydantic import BaseModel
from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    email_hash: Mapped[str] = mapped_column(
        String, unique=True, nullable=False, index=True
    )
    email_enc: Mapped[str] = mapped_column(String, nullable=False)
    hashed_token: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    token_created_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.now
    )

    files: Mapped[List["File"]] = relationship(
        "File", back_populates="owner", cascade="all, delete"
    )


class File(Base):
    __tablename__ = "files"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    owner_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String, nullable=False)
    filepath: Mapped[str] = mapped_column(String, nullable=False)
    meta_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    encryption_key_enc: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.now
    )

    owner: Mapped["User"] = relationship("User", back_populates="files")
    keywords: Mapped[List["FileKeyword"]] = relationship(
        "FileKeyword", back_populates="file", cascade="all, delete-orphan"
    )
    shares: Mapped[List["FileShare"]] = relationship(
        "FileShare", back_populates="file", cascade="all, delete-orphan"
    )


class FileKeyword(Base):
    __tablename__ = "file_keywords"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    file_id: Mapped[str] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    keyword: Mapped[str] = mapped_column(String, index=True)

    file: Mapped["File"] = relationship("File", back_populates="keywords")


class FileShare(Base):
    __tablename__ = "file_shares"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    file_id: Mapped[str] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    shared_with_email: Mapped[str] = mapped_column(String, nullable=False)
    shared_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.now
    )

    file: Mapped["File"] = relationship("File", back_populates="shares")


class Log(Base):
    __tablename__ = "logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.now
    )
    details_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hash: Mapped[str] = mapped_column(String, nullable=False)


class SuccessResponse(BaseModel):
    detail: str
    data: dict
