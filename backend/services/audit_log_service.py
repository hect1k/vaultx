from sqlalchemy.orm import Session
from app import models
from app.utils.crypto import encrypt_string


def create_audit_log(db: Session, user_id: int, action: str, details: str):
    db_log = models.AuditLog(
        user_id=user_id,
        action=action,
        details_enc=encrypt_string(details),
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def list_audit_logs_for_user(db: Session, user_id: int):
    return db.query(models.AuditLog).filter(models.AuditLog.user_id == user_id).all()


def list_all_audit_logs(db: Session, limit: int = 100):
    return (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
