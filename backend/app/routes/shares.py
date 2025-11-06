import base64
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db import get_db
from app.models import File, FileShare, User
from app.schemas import FileShareCreate, FileShareRead, FileShareRevoke

router = APIRouter(prefix="/shares", tags=["shares"])


@router.post("", response_model=FileShareRead)
async def share_file(
    payload: FileShareCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(File).where(File.id == payload.file_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can share the file")

    res = await db.execute(select(User).where(User.email == payload.recipient_email))
    recipient = res.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    try:
        wrapped_key = base64.b64decode(payload.wrapped_key_b64)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Invalid wrapped_key (not valid base64)"
        )

    q = await db.execute(
        select(FileShare).where(
            FileShare.file_id == payload.file_id,
            FileShare.recipient_user_id == recipient.id,
        )
    )
    existing = q.scalar_one_or_none()

    if existing:
        setattr(existing, "wrapped_key", wrapped_key)
        setattr(existing, "permissions", payload.permissions)
        await db.commit()
        await db.refresh(existing)
        return FileShareRead(
            id=getattr(existing, "id"),
            file_id=getattr(existing, "file_id"),
            recipient_user_id=getattr(existing, "recipient_user_id"),
            permissions=getattr(existing, "permissions"),
            created_at=getattr(existing, "created_at"),
        )

    share = FileShare(
        file_id=payload.file_id,
        owner_user_id=current_user.id,
        recipient_user_id=recipient.id,
        wrapped_key=wrapped_key,
        permissions=payload.permissions,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)
    return FileShareRead(
        id=getattr(share, "id"),
        file_id=getattr(share, "file_id"),
        recipient_user_id=getattr(share, "recipient_user_id"),
        permissions=getattr(share, "permissions"),
        created_at=getattr(share, "created_at"),
    )


@router.delete("")
async def revoke_share(
    payload: FileShareRevoke,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    file_id = payload.file_id
    recipient_email = payload.recipient_email
    res = await db.execute(select(File).where(File.id == file_id))
    file = res.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can revoke sharing")

    r = await db.execute(select(User).where(User.email == recipient_email))
    recipient = r.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    q = await db.execute(
        select(FileShare).where(
            FileShare.file_id == file_id,
            FileShare.recipient_user_id == recipient.id,
        )
    )
    share = q.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    await db.execute(delete(FileShare).where(FileShare.id == getattr(share, "id")))
    await db.commit()
    return {"revoked": True, "file_id": file_id, "recipient_email": recipient_email}


@router.get("/file/{file_id}", response_model=List[FileShareRead])
async def list_shares_for_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    res = await db.execute(select(File).where(File.id == file_id))
    file = res.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can view shares")

    q = await db.execute(select(FileShare).where(FileShare.file_id == file_id))
    rows = q.scalars().all()
    out: List[FileShareRead] = []
    for s in rows:
        out.append(
            FileShareRead(
                id=getattr(s, "id"),
                file_id=getattr(s, "file_id"),
                recipient_user_id=getattr(s, "recipient_user_id"),
                permissions=getattr(s, "permissions"),
                created_at=getattr(s, "created_at"),
            )
        )
    return out


@router.get("/me", response_model=List[FileShareRead])
async def list_shares_for_recipient(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = await db.execute(
        select(FileShare).where(FileShare.recipient_user_id == current_user.id)
    )
    rows = q.scalars().all()
    out: List[FileShareRead] = []
    for s in rows:
        out.append(
            FileShareRead(
                id=getattr(s, "id"),
                file_id=getattr(s, "file_id"),
                recipient_user_id=getattr(s, "recipient_user_id"),
                permissions=getattr(s, "permissions"),
                created_at=getattr(s, "created_at"),
            )
        )
    return out
