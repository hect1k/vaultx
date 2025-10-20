import secrets
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import User
from app.services import auth_service

router = APIRouter()


class RequestTokenIn(BaseModel):
    email: EmailStr


class ConsumeTokenIn(BaseModel):
    email: EmailStr
    token: str


class JWTOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshTokenIn(BaseModel):
    refresh_token: str


def hmac_compare(a: str, b: str) -> bool:
    if a == "" or b == "":
        return False
    return hmac_compare_impl(a, b)


def hmac_compare_impl(a: str, b: str) -> bool:
    return secrets.compare_digest(a, b)


@router.post("/request-token", response_model=dict)
def request_token(payload: RequestTokenIn, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    magic = auth_service.gen_magic_token()
    hashed = auth_service.hash_token(magic)
    user.hashed_token = hashed
    user.token_created_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    # TODO: add email sending
    return {
        "status": "ok",
        "message": "Magic token generated (DEV mode)",
        "magic_token": magic,
    }


@router.post("/consume-token", response_model=JWTOut)
def consume_token(payload: ConsumeTokenIn, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.hashed_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token or email"
        )

    if auth_service.token_is_expired(user.token_created_at):
        user.hashed_token = None
        user.token_created_at = None
        db.add(user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired"
        )

    provided_hash = auth_service.hash_token(payload.token)
    if not hmac_compare(provided_hash, user.hashed_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token"
        )

    access_token = auth_service.create_access_token(sub=user.id)
    refresh_token = auth_service.create_refresh_token(sub=user.id)

    user.hashed_token = None
    user.token_created_at = None
    db.add(user)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=dict)
def refresh_token(payload: RefreshTokenIn):
    try:
        data = auth_service.decode_jwt(payload.refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")

        sub = data.get("sub")

        new_access = auth_service.create_access_token(sub=sub)
        return {"access_token": new_access, "token_type": "bearer"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
