import base64
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db import get_db
from app.models import IndexEntry
from app.schemas import SearchToken

router = APIRouter(prefix="/search", tags=["search"])


@router.post("")
async def search(
    payload: SearchToken,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    token = payload.token
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")

    current_token = base64.b64decode(token)
    visited: set[bytes] = set()
    values: list[str] = []

    while bool(current_token) and current_token not in visited:
        visited.add(current_token)
        result = await db.execute(
            select(IndexEntry).where(
                IndexEntry.token == current_token,
                IndexEntry.owner_id == current_user.id,
            )
        )
        entry: Any = result.scalar_one_or_none()
        if not entry:
            break
        value_bytes = bytes(getattr(entry, "value"))
        values.append(base64.b64encode(value_bytes).decode())
        current_token = getattr(entry, "prev_token")

    return {"values": values, "count": len(values)}
