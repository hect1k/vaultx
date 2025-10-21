import mimetypes
import os
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from app.core.config import Settings
from app.deps import get_current_user, get_db
from app.models.models import File, FileKeyword, FileShare, SuccessResponse, User
from app.services.auth_service import decrypt_for_user, encrypt_for_user
from app.utils.crypto import (
    decrypt_email,
    decrypt_file_streamed,
    encrypt_email,
    encrypt_file_streamed,
    generate_aes_key,
    hash_email,
    hash_keyword,
)
from app.utils.logging import log_action_async

router = APIRouter()

settings = Settings()
UPLOAD_DIR = os.path.join(settings.STORAGE_PATH, "files")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR + "/tmp", exist_ok=True)


@router.get("/", response_model=SuccessResponse)
async def list_files(
    filter: Literal["all", "owned", "shared"] = Query("all"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owned_files = db.query(File).filter(File.owner_id == current_user.id).all()
    shared_files = (
        db.query(File)
        .join(FileShare, FileShare.file_id == File.id)
        .filter(FileShare.shared_with_email == current_user.email_hash)
        .all()
    )

    if filter == "owned":
        files = owned_files
    elif filter == "shared":
        files = shared_files
    else:
        files = owned_files + shared_files

    files.sort(key=lambda f: f.uploaded_at, reverse=True)

    total = len(files)
    start = (page - 1) * limit
    end = start + limit
    paginated_files = files[start:end]

    result = []
    for f in paginated_files:
        result.append(
            {
                "id": f.id,
                "owner": decrypt_email(f.owner.email_enc),
                "filename": f.filename,
                "uploaded_at": f.uploaded_at,
            }
        )

    await log_action_async(
        db,
        decrypt_email(current_user.email_enc),
        "LIST FILES",
        f"Listed {len(result)} files (page {page}, limit {limit})",
    )

    return {
        "detail": "Successfully listed files",
        "data": {
            "page": page,
            "limit": limit,
            "total": total,
            "files": result,
        },
    }


@router.post("/", response_model=SuccessResponse)
async def upload_file(
    file: UploadFile,
    keywords: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    current_user_email = decrypt_email(current_user.email_enc)
    file_id = str(uuid.uuid4())

    temp_path = os.path.join(UPLOAD_DIR, "tmp", file_id)
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())
    except Exception as e:
        print("ERROR SAVING TEMP FILE: ", e)
        raise HTTPException(status_code=500, detail="Failed to save file")

    mime_type, _ = mimetypes.guess_type(file.filename)
    file_stats = os.stat(temp_path)
    metadata = {
        "filename": file.filename,
        "size": file_stats.st_size,
        "mime": mime_type or "application/octet-stream",
        "uploaded_at": datetime.now().isoformat(),
    }

    aes_key = generate_aes_key()
    encrypted_path = os.path.join(UPLOAD_DIR, f"{file_id}.enc")
    encrypt_file_streamed(temp_path, encrypted_path, aes_key)

    encryption_key_enc = encrypt_for_user(current_user_email, aes_key.hex())

    new_file = File(
        id=file_id,
        owner_id=current_user.id,
        filename=file.filename,
        filepath=encrypted_path,
        meta_json=metadata,
        encryption_key_enc=encryption_key_enc,
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    name, ext = os.path.splitext(file.filename)
    keywords_list = [name.lower(), ext.lower(), metadata["mime"].lower()]

    if keywords:
        user_keywords = [k.strip().lower() for k in keywords.split(",") if k.strip()]
        keywords_list.extend(user_keywords)

    for kw in keywords_list:
        db.add(FileKeyword(file_id=new_file.id, keyword=hash_keyword(kw)))
    db.commit()

    try:
        os.remove(temp_path)
    except Exception:
        pass

    await log_action_async(
        db, current_user_email, "UPLOAD FILE", f"File {file.filename} uploaded"
    )

    return {
        "detail": "File uploaded successfully",
        "data": {
            "id": new_file.id,
            "owner": current_user_email,
            "filename": new_file.filename,
            "uploaded_at": new_file.uploaded_at,
        },
    }


@router.get("/search", response_model=SuccessResponse)
async def search_files(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter is required")

    current_user_email = decrypt_email(current_user.email_enc)
    await log_action_async(db, current_user_email, "SEARCH FILES", f"Searched for {q}")

    q_hash = hash_keyword(q)

    keyword_matches = (
        db.query(FileKeyword.file_id).filter(FileKeyword.keyword == q_hash).subquery()
    )
    filename_matches = (
        db.query(File.id).filter(File.filename.ilike(f"%{q.lower()}%")).subquery()
    )

    matched_files = (
        db.query(File)
        .filter(
            (File.id.in_(keyword_matches.select()))
            | (File.id.in_(filename_matches.select()))
        )
        .all()
    )

    accessible_files = []
    for f in matched_files:
        has_access = (
            f.owner_id == current_user.id
            or db.query(FileShare)
            .filter(
                FileShare.file_id == f.id,
                FileShare.shared_with_email == current_user.email_hash,
            )
            .first()
        )
        if has_access:
            accessible_files.append(
                {
                    "id": f.id,
                    "filename": f.filename,
                    "uploaded_at": f.uploaded_at.isoformat(),
                    "owner": decrypt_email(f.owner.email_enc),
                }
            )

    accessible_files.sort(key=lambda x: x["uploaded_at"], reverse=True)

    total = len(accessible_files)
    start = (page - 1) * limit
    end = start + limit
    paginated_files = accessible_files[start:end]

    return {
        "detail": f"{total} files found",
        "data": {
            "query": q,
            "page": page,
            "limit": limit,
            "total": total,
            "results": paginated_files,
        },
    }


@router.get("/{file_id}")
async def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    current_user_email = decrypt_email(current_user.email_enc)

    if file.owner_id != current_user.id:
        shared = (
            db.query(FileShare)
            .filter(
                FileShare.file_id == file_id,
                FileShare.shared_with_email == current_user.email_hash,
            )
            .first()
        )
        if not shared:
            await log_action_async(
                db,
                current_user_email,
                "DOWNLOAD FILE",
                f"Tried to download {file.filename} without permission",
            )
            raise HTTPException(status_code=403, detail="Access denied")

    try:
        aes_key_hex = decrypt_for_user(
            decrypt_email(file.owner.email_enc), file.encryption_key_enc
        )
        aes_key = bytes.fromhex(aes_key_hex)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt file key")

    if not os.path.exists(file.filepath):
        raise HTTPException(status_code=404, detail="Encrypted file missing")

    def file_iterator():
        yield from decrypt_file_streamed(file.filepath, aes_key)

    if file.meta_json:
        content_type = file.meta_json.get("mime", "application/octet-stream")
    else:
        content_type = "application/octet-stream"

    await log_action_async(
        db, current_user_email, "DOWNLOAD FILE", f"File {file.filename} downloaded"
    )

    return StreamingResponse(
        file_iterator(),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{file.filename}"'},
    )


@router.delete("/{file_id}", response_model=SuccessResponse)
async def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user_email = decrypt_email(current_user.email_enc)

    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if file.owner_id != current_user.id:
        await log_action_async(
            db,
            current_user_email,
            "DELETE FILE",
            f"Tried to delete {file.filename} without permission",
        )
        raise HTTPException(status_code=403, detail="Only owner can delete file")

    file_path = os.path.join(settings.STORAGE_PATH, "files", file.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(file)
    db.commit()

    await log_action_async(
        db, current_user_email, "DELETE FILE", f"Deleted {file.filename}"
    )

    return {
        "detail": "File deleted successfully",
        "data": {"filename": file.filename},
    }


class ShareFileIn(BaseModel):
    email: str


@router.post("/{file_id}/share", response_model=SuccessResponse)
async def share_file(
    file_id: str,
    payload: ShareFileIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can share file")

    current_user_email = decrypt_email(current_user.email_enc)

    email = payload.email.lower()

    if current_user_email == email:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")

    recipient_email_hash = hash_email(email)

    recipient = db.query(User).filter(User.email_hash == recipient_email_hash).first()

    if not recipient:  # then create a new user
        recipient = User(
            email_hash=recipient_email_hash,
            email_enc=encrypt_email(email),
        )
        db.add(recipient)
        db.commit()
        db.refresh(recipient)

    existing_share = (
        db.query(FileShare)
        .filter(
            FileShare.file_id == file.id,
            FileShare.shared_with_email == recipient.email_hash,
        )
        .first()
    )

    if existing_share:
        return {
            "detail": "File already shared with this user",
            "data": {"file_id": file_id},
        }

    share = FileShare(file_id=file.id, shared_with_email=recipient.email_hash)
    db.add(share)
    db.commit()

    await log_action_async(
        db,
        current_user_email,
        "SHARE FILE",
        f"Shared {file.filename} with {email.lower()}",
    )

    return {
        "detail": f"File shared with {email.lower()}",
        "data": {"file_id": file_id},
    }
