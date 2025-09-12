from sqlalchemy.orm import Session
from app import models, schemas

# TODO: encrypt file


def add_file(db: Session, file_in: schemas.FileCreate, owner_id: int):
    db_file = models.File(
        name=file_in.name,
        path=file_in.path,
        size=file_in.size,
        mime_type=file_in.mime_type,
        owner_id=owner_id,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def get_file(db: Session, file_id: int):
    return db.query(models.File).filter(models.File.id == file_id).first()


def list_files_by_user(db: Session, user_id: int):
    return db.query(models.File).filter(models.File.owner_id == user_id).all()


def delete_file(db: Session, file_id: int):
    file = get_file(db, file_id)
    if file:
        db.delete(file)
        db.commit()
        return True
    return False
