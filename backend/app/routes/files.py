import base64
import json
import uuid

from fastapi import APIRouter, Depends
from fastapi import File as FastAPIFile
from fastapi import Form, HTTPException, Query, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit_decorator import audit_event
from app.core.deps import get_current_user
from app.db import get_db
from app.models import File, FileShare, IndexEntry, User
from app.schemas import FileBatchList, FileUploadResponse

router = APIRouter(prefix="/files", tags=["files"])


# ----------------------------
# Upload new file
# ----------------------------
@router.post("/upload", response_model=FileUploadResponse)
@audit_event("file_upload")
async def upload_file(
    request: Request,
    file_id: str = Form(...),
    metadata_ciphertext: str = Form(...),
    metadata_iv: str = Form(...),
    tokens_json: str = Form(...),
    encrypted_kf_b64: str = Form(...),
    encrypted_kf_iv: str = Form(...),
    file_iv: str = Form(...),
    file: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        file_uuid = uuid.UUID(file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file_id")

    existing = await db.get(File, file_uuid)
    if existing:
        raise HTTPException(status_code=409, detail="File ID already exists")

    try:
        data = await file.read()
        encrypted_kf = base64.b64decode(encrypted_kf_b64)
        metadata_bytes = base64.b64decode(metadata_ciphertext)
        metadata_iv_b = base64.b64decode(metadata_iv)
        encrypted_kf_iv_b = base64.b64decode(encrypted_kf_iv)
        file_iv_b = base64.b64decode(file_iv)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 payload")

    new_file = File(
        id=file_uuid,
        owner_id=current_user.id,
        ciphertext=data,
        metadata_ciphertext=metadata_bytes,
        metadata_iv=metadata_iv_b,
        encrypted_kf=encrypted_kf,
        encrypted_kf_iv=encrypted_kf_iv_b,
        file_iv=file_iv_b,
    )
    db.add(new_file)
    await db.flush()

    try:
        tokens = json.loads(tokens_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid tokens JSON")

    for t in tokens:
        token_b = base64.b64decode(t["token"])

        value_obj = t.get("value")
        if (
            not isinstance(value_obj, dict)
            or "ciphertext_b64" not in value_obj
            or "iv_b64" not in value_obj
        ):
            raise HTTPException(status_code=400, detail="Invalid token value format")

        value_json = json.dumps(value_obj).encode()

        prev_b = base64.b64decode(t["prev_token"]) if t.get("prev_token") else None

        db.add(
            IndexEntry(
                token=token_b,
                owner_id=current_user.id,
                value=value_json,  # JSON-encoded ciphertext+iv
                prev_token=prev_b,
            )
        )

    await db.commit()
    await db.refresh(new_file)
    return FileUploadResponse(
        id=getattr(new_file, "id"),
        created_at=getattr(new_file, "created_at"),
    )


# ----------------------------
# List all files (owned + shared)
# ----------------------------
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

    # Owned files
    owned_q = await db.execute(
        select(File, User.email)
        .join(User, File.owner_id == User.id)
        .where(File.owner_id == current_user.id, File.deleted.is_(False))
        .limit(limit)
        .offset(offset)
    )
    owned_files = owned_q.all()

    # Shared files
    shared_q = await db.execute(
        select(File, User.email, FileShare)
        .join(User, File.owner_id == User.id)
        .join(FileShare, FileShare.file_id == File.id)
        .where(FileShare.recipient_user_id == current_user.id, File.deleted.is_(False))
        .limit(limit)
        .offset(offset)
    )
    shared_files = shared_q.all()

    out = []

    # Owned
    for f, owner_email in owned_files:
        shared_entries = await db.execute(
            select(User.email)
            .join(FileShare, FileShare.recipient_user_id == User.id)
            .where(FileShare.file_id == f.id)
        )
        shared_emails = [row[0] for row in shared_entries.all()]

        out.append(
            {
                "id": str(f.id),
                "owner_email": owner_email,
                "metadata_ciphertext": base64.b64encode(
                    f.metadata_ciphertext or b""
                ).decode(),
                "metadata_iv": base64.b64encode(f.metadata_iv or b"").decode(),
                "encrypted_kf_b64": base64.b64encode(f.encrypted_kf or b"").decode(),
                "encrypted_kf_iv": base64.b64encode(f.encrypted_kf_iv or b"").decode(),
                "wrapped_key_b64": None,
                "created_at": f.created_at,
                "deleted": bool(f.deleted),
                "shared_with": shared_emails,
            }
        )

    # Shared
    for f, owner_email, share in shared_files:
        out.append(
            {
                "id": str(f.id),
                "owner_email": owner_email,
                "metadata_ciphertext": base64.b64encode(
                    f.metadata_ciphertext or b""
                ).decode(),
                "metadata_iv": base64.b64encode(f.metadata_iv or b"").decode(),
                "encrypted_kf_b64": None,
                "encrypted_kf_iv": None,
                "wrapped_key_b64": base64.b64encode(share.wrapped_key or b"").decode(),
                "created_at": f.created_at,
                "deleted": bool(f.deleted),
                "shared_with": [],
            }
        )

    return {
        "total": total,
        "count": len(out),
        "limit": limit,
        "offset": offset,
        "files": out,
    }


# ----------------------------
# Recently created files
# ----------------------------
@router.get("/recent", response_model=dict)
async def list_recent_files(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Both queries must have the exact same columns and order
    owned_query = (
        select(
            File.id.label("id"),
            File.metadata_ciphertext.label("metadata_ciphertext"),
            File.metadata_iv.label("metadata_iv"),
            File.encrypted_kf.label("encrypted_kf"),
            File.encrypted_kf_iv.label("encrypted_kf_iv"),
            File.created_at.label("created_at"),
            File.deleted.label("deleted"),
            User.email.label("owner_email"),
            func.null().label("wrapped_key"),  # keep column alignment
        )
        .join(User, File.owner_id == User.id)
        .where(File.owner_id == current_user.id, File.deleted.is_(False))
    )

    shared_query = (
        select(
            File.id.label("id"),
            File.metadata_ciphertext.label("metadata_ciphertext"),
            File.metadata_iv.label("metadata_iv"),
            func.null().label("encrypted_kf"),  # no owned key for shared
            func.null().label("encrypted_kf_iv"),
            File.created_at.label("created_at"),
            File.deleted.label("deleted"),
            User.email.label("owner_email"),
            FileShare.wrapped_key.label("wrapped_key"),
        )
        .join(User, File.owner_id == User.id)
        .join(FileShare, FileShare.file_id == File.id)
        .where(FileShare.recipient_user_id == current_user.id, File.deleted.is_(False))
    )

    # union + subquery + sorting
    union_subq = owned_query.union_all(shared_query).subquery()
    recent_query = select(union_subq).order_by(union_subq.c.created_at.desc()).limit(10)

    result = await db.execute(recent_query)
    rows = result.all()

    out = []
    for r in rows:
        out.append(
            {
                "id": str(r.id),
                "owner_email": r.owner_email,
                "metadata_ciphertext": base64.b64encode(
                    r.metadata_ciphertext or b""
                ).decode(),
                "metadata_iv": base64.b64encode(r.metadata_iv or b"").decode(),
                "encrypted_kf_b64": (
                    base64.b64encode(r.encrypted_kf or b"").decode()
                    if r.encrypted_kf
                    else None
                ),
                "encrypted_kf_iv": (
                    base64.b64encode(r.encrypted_kf_iv or b"").decode()
                    if r.encrypted_kf_iv
                    else None
                ),
                "wrapped_key_b64": (
                    base64.b64encode(r.wrapped_key or b"").decode()
                    if r.wrapped_key
                    else None
                ),
                "created_at": r.created_at,
                "deleted": bool(r.deleted),
            }
        )

    return {"files": out}


# ----------------------------
# Batch get files
# ----------------------------
@router.post("/batch", response_model=dict)
async def list_files_by_ids(
    payload: FileBatchList,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ids = payload.ids
    if not ids:
        raise HTTPException(status_code=400, detail="No file IDs provided")

    result = await db.execute(
        select(File, User.email)
        .join(User, File.owner_id == User.id)
        .where(File.id.in_(ids), File.deleted.is_(False))
    )
    files = result.all()

    out = []
    for f, owner_email in files:
        encrypted_kf_b64 = None
        encrypted_kf_iv = None
        wrapped_key_b64 = None

        if f.owner_id == current_user.id:
            encrypted_kf_b64 = base64.b64encode(f.encrypted_kf or b"").decode()
            encrypted_kf_iv = base64.b64encode(f.encrypted_kf_iv or b"").decode()
        else:
            share_check = await db.execute(
                select(FileShare).where(
                    FileShare.file_id == f.id,
                    FileShare.recipient_user_id == current_user.id,
                )
            )
            share = share_check.scalar_one_or_none()
            if share:
                wrapped_key_b64 = base64.b64encode(share.wrapped_key or b"").decode()  # type: ignore

        out.append(
            {
                "id": str(f.id),
                "owner_email": owner_email,
                "metadata_ciphertext": base64.b64encode(
                    f.metadata_ciphertext or b""
                ).decode(),
                "metadata_iv": base64.b64encode(f.metadata_iv or b"").decode(),
                "encrypted_kf_b64": encrypted_kf_b64,
                "encrypted_kf_iv": encrypted_kf_iv,
                "wrapped_key_b64": wrapped_key_b64,
                "created_at": f.created_at,
                "deleted": bool(f.deleted),
            }
        )

    return {"count": len(out), "files": out}


# ----------------------------
# Deleted files
# ----------------------------
@router.get("/deleted", response_model=dict)
async def list_deleted_files(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(File, User.email)
        .join(User, File.owner_id == User.id)
        .where(File.owner_id == current_user.id, File.deleted.is_(True))
    )
    files = result.all()

    out = []
    for f, owner_email in files:

        print(f.id, id)

        out.append(
            {
                "id": str(f.id),
                "owner_email": owner_email,
                "metadata_ciphertext": base64.b64encode(
                    f.metadata_ciphertext or b""
                ).decode(),
                "metadata_iv": base64.b64encode(f.metadata_iv or b"").decode(),
                "encrypted_kf_b64": base64.b64encode(f.encrypted_kf or b"").decode(),
                "encrypted_kf_iv": base64.b64encode(f.encrypted_kf_iv or b"").decode(),
                "wrapped_key_b64": None,
                "created_at": f.created_at,
                "deleted": bool(f.deleted),
            }
        )

    return {"count": len(out), "files": out}


# ----------------------------
# Get single file (owned or shared)
# ----------------------------
@router.get("/{file_id}", response_model=dict)
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
    encrypted_kf_b64 = None
    encrypted_kf_iv = None
    wrapped_key_b64 = None

    if f.owner_id == current_user.id:
        encrypted_kf_b64 = base64.b64encode(f.encrypted_kf or b"").decode()
        encrypted_kf_iv = base64.b64encode(f.encrypted_kf_iv or b"").decode()
    else:
        share_check = await db.execute(
            select(FileShare).where(
                FileShare.file_id == f.id,
                FileShare.recipient_user_id == current_user.id,
            )
        )
        share = share_check.scalar_one_or_none()
        if not share:
            raise HTTPException(status_code=403, detail="Access denied")
        wrapped_key_b64 = base64.b64encode(share.wrapped_key or b"").decode()  # type: ignore

    shared_emails = []
    if f.owner_id == current_user.id:
        shared_entries = await db.execute(
            select(User.email)
            .join(FileShare, FileShare.recipient_user_id == User.id)
            .where(FileShare.file_id == f.id)
        )
        shared_emails = [r[0] for r in shared_entries.all()]

    return {
        "id": str(f.id),
        "owner_email": owner_email,
        "metadata_ciphertext": base64.b64encode(f.metadata_ciphertext or b"").decode(),
        "metadata_iv": base64.b64encode(f.metadata_iv or b"").decode(),
        "encrypted_kf_b64": encrypted_kf_b64,
        "encrypted_kf_iv": encrypted_kf_iv,
        "wrapped_key_b64": wrapped_key_b64,
        "created_at": f.created_at,
        "deleted": bool(f.deleted),
        "shared_with": shared_emails,
    }


# ----------------------------
# Download file (with key info)
# ----------------------------
@router.get("/{file_id}/download", response_model=dict)
@audit_event("file_download")
async def download_file(
    request: Request,
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

    f, _ = entry
    encrypted_kf_b64 = None
    encrypted_kf_iv = None
    wrapped_key_b64 = None

    if f.owner_id == current_user.id:
        encrypted_kf_b64 = base64.b64encode(f.encrypted_kf or b"").decode()
        encrypted_kf_iv = base64.b64encode(f.encrypted_kf_iv or b"").decode()
    else:
        share_check = await db.execute(
            select(FileShare).where(
                FileShare.file_id == f.id,
                FileShare.recipient_user_id == current_user.id,
            )
        )
        share = share_check.scalar_one_or_none()
        if not share:
            raise HTTPException(status_code=403, detail="Access denied")
        wrapped_key_b64 = base64.b64encode(share.wrapped_key or b"").decode()  # type: ignore

    return {
        "id": str(f.id),
        "ciphertext": base64.b64encode(f.ciphertext or b"").decode(),
        "file_iv": base64.b64encode(f.file_iv or b"").decode(),
        "metadata_ciphertext": base64.b64encode(f.metadata_ciphertext or b"").decode(),
        "metadata_iv": base64.b64encode(f.metadata_iv or b"").decode(),
        "encrypted_kf_b64": encrypted_kf_b64,
        "encrypted_kf_iv": encrypted_kf_iv,
        "wrapped_key_b64": wrapped_key_b64,
        "created_at": f.created_at,
    }


# ----------------------------
# Delete file (soft delete)
# ----------------------------
@router.delete("/{file_id}", response_model=dict)
@audit_event("file_delete")
async def delete_file(
    request: Request,
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    file = await db.get(File, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete file")

    file.deleted = True  # type: ignore
    await db.commit()

    return {"message": "File deleted successfully"}


# ----------------------------
# Restore file
# ----------------------------
@router.post("/{file_id}/restore", response_model=dict)
@audit_event("file_restore")
async def restore_file(
    request: Request,
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    file = await db.get(File, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can restore file")

    file.deleted = False  # type: ignore
    await db.commit()

    return {"message": "File restored successfully"}
