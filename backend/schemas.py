from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ----------------------
# User Schemas
# ----------------------


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    is_admin: bool = False
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserRead(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    is_admin: bool
    is_active: bool
    failed_login_attempts: int
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    last_login_user_agent: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ----------------------
# File Schemas
# ----------------------


class FileBase(BaseModel):
    name: str
    size: int
    mime_type: Optional[str] = None


class FileCreate(FileBase):
    pass


class FileRead(FileBase):
    id: int
    path: str
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ----------------------
# FileShare Schemas
# ----------------------


class FileShareBase(BaseModel):
    can_view: bool = True
    can_edit: bool = False


class FileShareCreate(FileShareBase):
    file_id: int
    user_id: int


class FileShareRead(FileShareBase):
    id: int
    file_id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True


# ----------------------
# AuditLog Schemas
# ----------------------


class AuditLogBase(BaseModel):
    action: str
    details: str


class AuditLogCreate(AuditLogBase):
    user_id: Optional[int] = None


class AuditLogRead(AuditLogBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        orm_mode = True
