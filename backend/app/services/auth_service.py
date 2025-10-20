import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

MAGIC_TOKEN_BYTES = 24
MAGIC_TOKEN_TTL_MINUTES = 15
JWT_TTL_MINUTES = settings.JWT_EXPIRE_MINUTES or 60
JWT_REFRESH_TTL_DAYS = settings.JWT_REFRESH_EXPIRE_DAYS or 30


def gen_magic_token() -> str:
    return secrets.token_urlsafe(MAGIC_TOKEN_BYTES)


def hash_token(token: str) -> str:
    key = settings.APP_SECRET_KEY.encode()
    return hmac.new(key, token.encode(), hashlib.sha256).hexdigest()


def token_is_expired(created_at: Optional[datetime]) -> bool:
    if created_at is None:
        return True
    now = datetime.now(timezone.utc)
    return (now - created_at) > timedelta(minutes=MAGIC_TOKEN_TTL_MINUTES)


def create_access_token(sub: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_TTL_MINUTES),
        "type": "access",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(sub: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "iat": now,
        "exp": now + timedelta(days=JWT_REFRESH_TTL_DAYS),
        "type": "refresh",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_jwt(token: str):
    return jwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )


def _derive_user_key(email: str) -> bytes:
    return hashlib.sha256(f"{email}{settings.APP_SECRET_KEY}".encode()).digest()


def encrypt_for_user(email: str, data: str) -> str:
    key = _derive_user_key(email)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_for_user(email: str, token: str) -> str:
    key = _derive_user_key(email)
    raw = base64.b64decode(token.encode())
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()
