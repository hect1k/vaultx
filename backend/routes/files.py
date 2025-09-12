from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas
from app.services import file_share_service

router = APIRouter(prefix="/shares", tags=["file_shares"])


@router.post("/", response_model=schemas.FileShareRead)
def share_file(share_in: schemas.FileShareCreate, db: Session = Depends(get_db)):
    share = file_share_service.share_file(
        db,
        file_id=share_in.file_id,
        user_id=share_in.user_id,
        can_view=share_in.can_view,
        can_edit=share_in.can_edit,
    )
    return share


@router.get("/user/{user_id}", response_model=list[schemas.FileShareRead])
def get_shared_files(user_id: int, db: Session = Depends(get_db)):
    return file_share_service.get_shared_files_for_user(db, user_id)


@router.delete("/{share_id}")
def revoke_share(share_id: int, db: Session = Depends(get_db)):
    ok = file_share_service.revoke_share(db, share_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Share not found")
    return {"detail": "Share revoked"}
