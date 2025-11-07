import base64

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit_decorator import audit_event
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db import get_db
from app.models import User
from app.schemas import (
    AuthResponse,
    RegisterPayload,
    TokenResponse,
    UserKeysResponse,
    UserLogin,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
async def register_user(payload: RegisterPayload, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        password_salt_b64=payload.password_salt_b64.encode(),
        enc_master_key_b64=payload.enc_master_key_b64.encode(),
        enc_master_key_iv=payload.enc_master_key_iv.encode(),
        enc_search_key_b64=payload.enc_search_key_b64.encode(),
        enc_search_key_iv=payload.enc_search_key_iv.encode(),
        enc_private_key_b64=payload.enc_private_key_b64.encode(),
        enc_private_key_iv=payload.enc_private_key_iv.encode(),
        public_key_b64=payload.public_key_b64.encode(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    keys = UserKeysResponse(
        password_salt_b64=user.password_salt_b64.decode(),
        enc_master_key_b64=user.enc_master_key_b64.decode(),
        enc_master_key_iv=user.enc_master_key_iv.decode(),
        enc_search_key_b64=user.enc_search_key_b64.decode(),
        enc_search_key_iv=user.enc_search_key_iv.decode(),
        enc_private_key_b64=user.enc_private_key_b64.decode(),
        enc_private_key_iv=user.enc_private_key_iv.decode(),
        public_key_b64=user.public_key_b64.decode(),
    )

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        keys=keys,
    )


@router.post("/login", response_model=AuthResponse)
@audit_event("login")
async def login_user(
    user_in: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(select(User).where(User.email == user_in.email))
    user = user_result.scalar_one_or_none()
    if not user or not verify_password(user_in.password, str(user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    keys = UserKeysResponse(
        password_salt_b64=user.password_salt_b64.decode(),
        enc_master_key_b64=user.enc_master_key_b64.decode(),
        enc_master_key_iv=user.enc_master_key_iv.decode(),
        enc_search_key_b64=user.enc_search_key_b64.decode(),
        enc_search_key_iv=user.enc_search_key_iv.decode(),
        enc_private_key_b64=user.enc_private_key_b64.decode(),
        enc_private_key_iv=user.enc_private_key_iv.decode(),
        public_key_b64=user.public_key_b64.decode(),
    )

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        keys=keys,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    user_id = payload.get("sub")
    access = create_access_token({"sub": user_id})
    new_refresh = create_refresh_token({"sub": user_id})
    return TokenResponse(access_token=access, refresh_token=new_refresh)


@router.get("/public-key/{email}")
async def get_public_key(email: str, db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(User.public_key_b64).where(User.email == email))
    key = q.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="User not found")
    return {"public_key": key}
