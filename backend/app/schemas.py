from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    public_key_b64: str
    encrypted_private_key_b64: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class FileUploadResponse(BaseModel):
    id: UUID
    created_at: datetime


class SharedUser(BaseModel):
    email: str


class FileListItem(BaseModel):
    id: UUID
    owner_email: str
    metadata_ciphertext: str
    created_at: datetime
    deleted: bool
    shared_with: list[SharedUser] = []

    class Config:
        orm_mode = True


class FileBatchList(BaseModel):
    ids: list[UUID]


class FileDownloadResponse(BaseModel):
    id: UUID
    ciphertext: str
    metadata_ciphertext: str
    created_at: datetime

    class Config:
        orm_mode = True


class FileShareCreate(BaseModel):
    file_id: UUID
    recipient_email: EmailStr
    wrapped_key_b64: str
    permissions: str = "read"


class FileShareRead(BaseModel):
    id: UUID
    file_id: UUID
    recipient_user_id: UUID
    permissions: str
    created_at: datetime

    class Config:
        orm_mode = True


class FileShareRevoke(BaseModel):
    file_id: UUID
    recipient_email: EmailStr


class SearchToken(BaseModel):
    token: str


class BackupRead(BaseModel):
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True


class TamperLogRead(BaseModel):
    id: int
    user_id: UUID | None
    entry_json: dict
    entry_hash: str
    created_at: datetime

    class Config:
        orm_mode = True
