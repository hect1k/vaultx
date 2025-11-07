# app/models.py
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    password_salt_b64 = Column(LargeBinary, nullable=False)
    enc_master_key_b64 = Column(LargeBinary, nullable=False)
    enc_master_key_iv = Column(LargeBinary, nullable=False)

    enc_search_key_b64 = Column(LargeBinary, nullable=False)
    enc_search_key_iv = Column(LargeBinary, nullable=False)

    enc_private_key_b64 = Column(LargeBinary, nullable=False)
    enc_private_key_iv = Column(LargeBinary, nullable=False)

    public_key_b64 = Column(LargeBinary, nullable=False)

    index_state_ciphertext = Column(LargeBinary, nullable=True)
    index_state_iv = Column(LargeBinary, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now, nullable=False)

    files = relationship("File", back_populates="owner", cascade="all, delete-orphan")
    backups = relationship(
        "Backup", back_populates="user", cascade="all, delete-orphan"
    )
    shares = relationship(
        "FileShare",
        back_populates="recipient",
        foreign_keys="FileShare.recipient_user_id",
    )


class Role(Base):
    __tablename__ = "roles"
    name = Column(String, primary_key=True)


class UserRole(Base):
    __tablename__ = "user_roles"
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role = Column(
        String, ForeignKey("roles.name", ondelete="CASCADE"), primary_key=True
    )


class Backup(Base):
    __tablename__ = "backups"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    blob = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now, nullable=False)
    user = relationship("User", back_populates="backups")


class File(Base):
    __tablename__ = "files"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ciphertext = Column(LargeBinary, nullable=False)
    file_iv = Column(LargeBinary, nullable=False)
    metadata_ciphertext = Column(LargeBinary, nullable=False)
    metadata_iv = Column(LargeBinary, nullable=False)
    encrypted_kf = Column(LargeBinary, nullable=True)
    encrypted_kf_iv = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now, nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    owner = relationship("User", back_populates="files")
    shares = relationship(
        "FileShare", back_populates="file", cascade="all, delete-orphan"
    )


class FileShare(Base):
    __tablename__ = "file_shares"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    recipient_user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    wrapped_key = Column(LargeBinary, nullable=False)
    permissions = Column(String, default="read", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now, nullable=False)
    file = relationship("File", back_populates="shares", foreign_keys=[file_id])
    recipient = relationship(
        "User", back_populates="shares", foreign_keys=[recipient_user_id]
    )


class IndexEntry(Base):
    __tablename__ = "index_entries"
    token = Column(LargeBinary, primary_key=True)
    owner_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    value = Column(LargeBinary, nullable=False)
    prev_token = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now, nullable=False)
    __table_args__ = (
        Index("idx_index_entries_owner_created", "owner_id", "created_at"),
    )


class TamperLog(Base):
    __tablename__ = "tamper_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    entry_json = Column(JSON, nullable=False)
    entry_hash = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now, nullable=False)
    __table_args__ = (Index("idx_tamper_user_created", "user_id", "created_at"),)
