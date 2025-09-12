from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app import models, schemas
from app.utils.crypto import encrypt_string, sha256_hash, decrypt_string

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ------------------------
# Helpers
# ------------------------


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ------------------------
# Services
# ------------------------


def create_user(db: Session, user_in: schemas.UserCreate, is_admin: bool = False):
    db_user = models.User(
        email_enc=encrypt_string(user_in.email),
        email_hash=sha256_hash(user_in.email),
        first_name_enc=encrypt_string(user_in.first_name),
        last_name_enc=encrypt_string(user_in.last_name),
        hashed_password=get_password_hash(user_in.password),
        is_admin=is_admin,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_by_email(db: Session, email: str):
    return (
        db.query(models.User)
        .filter(models.User.email_hash == sha256_hash(email))
        .first()
    )


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def user_to_read_schema(user: models.User) -> schemas.UserRead:
    return schemas.UserRead(
        id=user.id,
        email=decrypt_string(user.email_enc),
        first_name=decrypt_string(user.first_name_enc),
        last_name=decrypt_string(user.last_name_enc),
        is_admin=user.is_admin,
        is_active=user.is_active,
        failed_login_attempts=user.failed_login_attempts,
        last_login_at=user.last_login_at,
        last_login_ip=(
            decrypt_string(user.last_login_ip_enc) if user.last_login_ip_enc else None
        ),
        last_login_user_agent=(
            decrypt_string(user.last_login_user_agent_enc)
            if user.last_login_user_agent_enc
            else None
        ),
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
