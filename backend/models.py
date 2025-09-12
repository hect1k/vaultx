from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Encrypted + hashed fields
    email_enc = Column(String, nullable=False)
    email_hash = Column(String, unique=True, index=True, nullable=False)

    first_name_enc = Column(String, nullable=False)
    last_name_enc = Column(String, nullable=False)

    # Auth
    hashed_password = Column(String, nullable=False)

    # Status flags
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    failed_login_attempts = Column(Integer, default=0)

    # Last login metadata
    last_login_at = Column(DateTime(timezone=True))
    last_login_ip_enc = Column(String, nullable=True)
    last_login_user_agent_enc = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    files = relationship("File", back_populates="owner", cascade="all, delete-orphan")
    shared_files_association = relationship("FileShare", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class File(Base):
    __tablename__ = "files"
    __table_args__ = (UniqueConstraint("path", name="uq_file_path"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    path = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    owner = relationship("User", back_populates="files")
    shared_with = relationship("FileShare", back_populates="file")


class FileShare(Base):
    __tablename__ = "file_shares"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    file = relationship("File", back_populates="shared_with")
    user = relationship("User", back_populates="shared_files_association")


# TODO: Chained, hashed logs


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    action = Column(String, nullable=False)
    details_enc = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="audit_logs")
