from sqlalchemy.orm import Session
from app import models


def share_file(
    db: Session,
    file_id: int,
    user_id: int,
    can_view: bool = True,
    can_edit: bool = False,
):
    db_share = models.FileShare(
        file_id=file_id,
        user_id=user_id,
        can_view=can_view,
        can_edit=can_edit,
    )
    db.add(db_share)
    db.commit()
    db.refresh(db_share)
    return db_share


def get_shared_files_for_user(db: Session, user_id: int):
    return db.query(models.FileShare).filter(models.FileShare.user_id == user_id).all()


def revoke_share(db: Session, share_id: int):
    share = db.query(models.FileShare).filter(models.FileShare.id == share_id).first()
    if share:
        db.delete(share)
        db.commit()
        return True
    return False
