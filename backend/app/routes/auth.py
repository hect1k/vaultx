import base64

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db import get_db
from app.models import User
from app.schemas import TokenResponse, UserCreate, UserLogin

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(User).where(User.email == payload.email))
    existing = q.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        public_key = base64.b64decode(payload.public_key_b64)
        encrypted_private_key = base64.b64decode(payload.encrypted_private_key_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid key encoding")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        public_key=public_key,
        encrypted_private_key=encrypted_private_key,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(user_in.password, str(user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    access = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access, refresh_token=refresh)


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
    q = await db.execute(select(User.public_key).where(User.email == email))
    key = q.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="User not found")
    return {"public_key_b64": base64.b64encode(bytes(key)).decode()}
