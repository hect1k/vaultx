from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.database import get_db
from app.models.models import SuccessResponse, User
from app.services import auth_service
from app.utils.crypto import encrypt_email, hash_email, hmac_compare
from app.utils.logging import log_action_async

settings = Settings()
router = APIRouter()


@router.post("/request", response_model=SuccessResponse)
async def request_token(email: str = Query(...), db: Session = Depends(get_db)):
    email = email.lower()
    hashed_email = hash_email(email)

    user = db.query(User).filter(User.email_hash == hashed_email).first()
    if not user:
        user = User(email_hash=hashed_email, email_enc=encrypt_email(email))
        db.add(user)
        db.commit()
        db.refresh(user)

    magic = auth_service.gen_magic_token()
    hashed = auth_service.hash_token(magic)
    user.hashed_token = hashed
    user.token_created_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()

    await log_action_async(db, email, "AUTH", "Requested Magic Token")

    if settings.APP_ENV != "prod":
        return {
            "detail": "Magic token generated (DEV mode)",
            "data": {"magic_token": magic, "email": email},
        }

    # TODO: add email sending
    return {
        "detail": "Magic token generated (DEV mode)",
        "data": {"magic_token": magic, "email": email},
    }


@router.post("/consume", response_model=dict)
async def consume_token(
    email: str = Query(...), token: str = Query(...), db: Session = Depends(get_db)
):
    email = email.lower()
    hashed_email = hash_email(email)

    user = db.query(User).filter(User.email_hash == hashed_email).first()
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

    provided_hash = auth_service.hash_token(token)
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

    await log_action_async(db, email, "AUTH", "Consumed Magic Token")

    return {
        "detail": "Magic token consumed",
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        },
    }


@router.post("/refresh", response_model=SuccessResponse)
async def refresh_token(
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )

    refresh_token = authorization.split(" ")[1]

    try:
        data = auth_service.decode_jwt(refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")

        sub = data.get("sub")
        new_access = auth_service.create_access_token(sub=sub)

        await log_action_async(db, sub, "AUTH", "Refreshed token")

        return {
            "detail": "Token refreshed",
            "data": {"access_token": new_access, "token_type": "bearer"},
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
