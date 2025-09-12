from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=schemas.UserRead)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = user_service.get_user_by_email(db, user_in.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = user_service.create_user(db, user_in)
    return user_service.user_to_read_schema(user)


@router.post("/login", response_model=schemas.UserRead)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = user_service.authenticate_user(db, user_in.email, user_in.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user_service.user_to_read_schema(user)


@router.get("/{user_id}", response_model=schemas.UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = (
        db.query(user_service.models.User)
        .filter(user_service.models.User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_service.user_to_read_schema(user)
