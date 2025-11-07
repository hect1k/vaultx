from functools import wraps

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit_log import record_audit_log
from app.db import get_db


def audit_event(action: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(
            *args, request: Request, db: AsyncSession = Depends(get_db), **kwargs
        ):
            response = await func(*args, request=request, db=db, **kwargs)

            user = kwargs.get("current_user")
            user_id = getattr(user, "id", None)

            try:
                await record_audit_log(
                    db=db,
                    request=request,
                    user_id=user_id,
                    action=action,
                    details={"route": func.__name__, "args": {}, "kwargs": {}},
                )
            except Exception as e:
                print(f"[AUDIT ERROR] Failed to record log: {e}")
            return response

        return wrapper

    return decorator
