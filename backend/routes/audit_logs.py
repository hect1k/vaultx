from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas
from app.services import audit_log_service

router = APIRouter(prefix="/logs", tags=["audit_logs"])


@router.post("/", response_model=schemas.AuditLogRead)
def create_log(log_in: schemas.AuditLogCreate, db: Session = Depends(get_db)):
    return audit_log_service.create_audit_log(
        db, log_in.user_id, log_in.action, log_in.details
    )


@router.get("/user/{user_id}", response_model=list[schemas.AuditLogRead])
def get_logs_for_user(user_id: int, db: Session = Depends(get_db)):
    return audit_log_service.list_audit_logs_for_user(db, user_id)


@router.get("/", response_model=list[schemas.AuditLogRead])
def get_all_logs(limit: int = 100, db: Session = Depends(get_db)):
    return audit_log_service.list_all_audit_logs(db, limit)
