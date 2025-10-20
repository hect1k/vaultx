import datetime
import hashlib
import uuid
from typing import List, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
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
        "FileKeyword", back_populates="file", cascade="all, delete"
    )
    shares: Mapped[List["FileShare"]] = relationship(
        "FileShare", back_populates="file", cascade="all, delete"
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
    user_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hash: Mapped[str] = mapped_column(String, nullable=False)
    prev_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    @staticmethod
    def generate_hash(
        prev_hash: Optional[str], action: str, details: Optional[str]
    ) -> str:
        content = f"{prev_hash or ''}{action}{details or ''}{datetime.datetime.now()}"
        return hashlib.sha256(content.encode()).hexdigest()
