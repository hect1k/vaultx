from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import User
from app.services import auth_service

bearer_scheme = HTTPBearer(auto_error=True)


def get_db_dep():
    yield from get_db()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db_dep),
) -> User:
    token = creds.credentials
    try:
        payload = auth_service.decode_jwt_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    user = db.query(User).filter(User.id == sub).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    return user
