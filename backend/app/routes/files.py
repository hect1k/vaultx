import mimetypes
import os
from datetime import datetime

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from app.core.config import Settings
from app.deps import get_current_user, get_db
from app.models.models import File, FileKeyword, FileShare
from app.services.auth_service import decrypt_for_user, encrypt_for_user
from app.utils.crypto import (decrypt_file_streamed, encrypt_file_streamed,
                              generate_aes_key, hash_keyword)

router = APIRouter()

settings = Settings()
UPLOAD_DIR = os.path.join(settings.STORAGE_PATH, "files")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_file(
    file: UploadFile,
    keywords: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    temp_path = os.path.join(UPLOAD_DIR, file.filename)
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
    encrypted_path = os.path.join(UPLOAD_DIR, f"{file.filename}.enc")
    encrypt_file_streamed(temp_path, encrypted_path, aes_key)

    encryption_key_enc = encrypt_for_user(current_user.email, aes_key.hex())

    new_file = File(
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

    # TODO: add logging

    # log_action(
    #     db=db,
    #     user_email=current_user.email,
    #     action="UPLOAD",
    #     details=f"File {file.filename} uploaded",
    # )

    return {"message": "File uploaded successfully", "file_id": new_file.id}


@router.get("/download/{file_id}")
def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if file.owner_id != current_user.id:
        shared = (
            db.query(FileShare)
            .filter(
                FileShare.file_id == file_id,
                FileShare.shared_with_email == current_user.email,
            )
            .first()
        )
        if not shared:
            raise HTTPException(status_code=403, detail="Access denied")

    try:
        aes_key_hex = decrypt_for_user(current_user.email, file.encryption_key_enc)
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

    return StreamingResponse(
        file_iterator(),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{file.filename}"'},
    )
