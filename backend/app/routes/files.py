import base64
import json
from typing import Any, List

from fastapi import APIRouter, Depends
from fastapi import File as FastAPIFile
from fastapi import Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db import get_db
from app.models import File, FileShare, IndexEntry, User
from app.schemas import (
    FileBatchList,
    FileDownloadResponse,
    FileListItem,
    FileUploadResponse,
    SharedUser,
)

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    metadata_ciphertext: str = Form(...),
    tokens_json: str = Form(...),
    encrypted_kf_b64: str = Form(...),
    file: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    data = await file.read()
    try:
        encrypted_kf = base64.b64decode(encrypted_kf_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid encrypted_kf_b64")

    new_file = File(
        owner_id=current_user.id,
        ciphertext=data,
        metadata_ciphertext=base64.b64decode(metadata_ciphertext),
        encrypted_kf=encrypted_kf,
    )
    db.add(new_file)
    await db.flush()

    try:
        tokens = json.loads(tokens_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid tokens JSON")

    for t in tokens:
        token_b = base64.b64decode(t["token"])
        value_b = base64.b64decode(t["value"])
        prev_b = base64.b64decode(t["prev_token"]) if t.get("prev_token") else None
        db.add(
            IndexEntry(
                token=token_b,
                owner_id=current_user.id,
                value=value_b,
                prev_token=prev_b,
            )
        )

    await db.commit()
    await db.refresh(new_file)
    return FileUploadResponse(
        id=getattr(new_file, "id"), created_at=getattr(new_file, "created_at")
    )


@router.get("", response_model=dict)
async def list_files(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    total_query = await db.execute(
        select(func.count())
        .select_from(File)
        .where(File.owner_id == current_user.id, File.deleted.is_(False))
    )
    total = total_query.scalar_one()

    result = await db.execute(
        select(File, User.email)
        .join(User, File.owner_id == User.id)
        .where(File.owner_id == current_user.id, File.deleted.is_(False))
        .limit(limit)
        .offset(offset)
    )
    owned_files = result.all()

    shared_result = await db.execute(
        select(File, User.email, FileShare)
        .join(User, File.owner_id == User.id)
        .join(FileShare, FileShare.file_id == File.id)
        .where(FileShare.recipient_user_id == current_user.id, File.deleted.is_(False))
        .limit(limit)
        .offset(offset)
    )
    shared_files = shared_result.all()

    out: List[FileListItem] = []

    for f, owner_email in owned_files:
        shared_entries = await db.execute(
            select(User.email)
            .join(FileShare, FileShare.recipient_user_id == User.id)
            .where(FileShare.file_id == f.id)
        )
        shared_emails = [SharedUser(email=e[0]) for e in shared_entries.all()]
        out.append(
            FileListItem(
                id=getattr(f, "id"),
                owner_email=owner_email,
                metadata_ciphertext=base64.b64encode(
                    bytes(getattr(f, "metadata_ciphertext"))
                ).decode(),
                created_at=getattr(f, "created_at"),
                deleted=bool(getattr(f, "deleted")),
                shared_with=shared_emails,
            )
        )

    for f, owner_email, _ in shared_files:
        out.append(
            FileListItem(
                id=getattr(f, "id"),
                owner_email=owner_email,
                metadata_ciphertext=base64.b64encode(
                    bytes(getattr(f, "metadata_ciphertext"))
                ).decode(),
                created_at=getattr(f, "created_at"),
                deleted=bool(getattr(f, "deleted")),
                shared_with=[],
            )
        )

    return {
        "total": total,
        "count": len(out),
        "limit": limit,
        "offset": offset,
        "files": out,
    }


@router.get("/{file_id}", response_model=FileListItem)
async def get_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(File, User.email)
        .join(User, File.owner_id == User.id)
        .where(File.id == file_id)
    )
    entry = result.first()
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")
    f, owner_email = entry
    if f.owner_id != current_user.id:
        share_check = await db.execute(
            select(FileShare).where(
                FileShare.file_id == f.id,
                FileShare.recipient_user_id == current_user.id,
            )
        )
        if not share_check.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")
    shared_emails = []
    if f.owner_id == current_user.id:
        shared_entries = await db.execute(
            select(User.email)
            .join(FileShare, FileShare.recipient_user_id == User.id)
            .where(FileShare.file_id == f.id)
        )
        shared_emails = [SharedUser(email=e[0]) for e in shared_entries.all()]
    return FileListItem(
        id=getattr(f, "id"),
        owner_email=owner_email,
        metadata_ciphertext=base64.b64encode(
            bytes(getattr(f, "metadata_ciphertext"))
        ).decode(),
        created_at=getattr(f, "created_at"),
        deleted=bool(getattr(f, "deleted")),
        shared_with=shared_emails,
    )


@router.post("/batch", response_model=dict)
async def list_files_by_ids(
    payload: FileBatchList,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):

    ids = payload.ids
    if not ids:
        raise HTTPException(status_code=400, detail="No file IDs provided")

    result = await db.execute(
        select(File, User.email)
        .join(User, File.owner_id == User.id)
        .where(File.id.in_(ids), File.deleted.is_(False))
        .limit(limit)
        .offset(offset)
    )
    files = result.all()

    total = len(ids)
    out: List[FileListItem] = []

    for f, owner_email in files:
        shared_emails = []
        if f.owner_id == current_user.id:
            shared_entries = await db.execute(
                select(User.email)
                .join(FileShare, FileShare.recipient_user_id == User.id)
                .where(FileShare.file_id == f.id)
            )
            shared_emails = [SharedUser(email=e[0]) for e in shared_entries.all()]
        out.append(
            FileListItem(
                id=getattr(f, "id"),
                owner_email=owner_email,
                metadata_ciphertext=base64.b64encode(
                    bytes(getattr(f, "metadata_ciphertext"))
                ).decode(),
                created_at=getattr(f, "created_at"),
                deleted=bool(getattr(f, "deleted")),
                shared_with=shared_emails,
            )
        )

    return {
        "total": total,
        "count": len(out),
        "limit": limit,
        "offset": offset,
        "files": out,
    }


@router.get("/{file_id}/download", response_model=FileDownloadResponse)
async def download_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(File, User.email)
        .join(User, File.owner_id == User.id)
        .where(File.id == file_id)
    )
    entry = result.first()
    if not entry:
        raise HTTPException(status_code=404, detail="File not found")
    f, owner_email = entry
    if f.owner_id != current_user.id:
        share_check = await db.execute(
            select(FileShare).where(
                FileShare.file_id == f.id,
                FileShare.recipient_user_id == current_user.id,
            )
        )
        if not share_check.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")
    return FileDownloadResponse(
        id=getattr(f, "id"),
        ciphertext=base64.b64encode(bytes(getattr(f, "ciphertext"))).decode(),
        metadata_ciphertext=base64.b64encode(
            bytes(getattr(f, "metadata_ciphertext"))
        ).decode(),
        created_at=getattr(f, "created_at"),
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )
    f: Any = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    setattr(f, "deleted", True)
    await db.commit()
    return {"deleted": True, "file_id": str(getattr(f, "id"))}
