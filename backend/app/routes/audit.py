from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit_verify import verify_audit_chain
from app.core.deps import get_current_user
from app.db import get_db
from app.models import TamperLog

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=dict)
async def get_user_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(TamperLog)
        .where(TamperLog.user_id == current_user.id)
        .order_by(TamperLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    logs = result.scalars().all()
    if not logs:
        return {"count": 0, "logs": []}

    output = []
    for log in logs:
        output.append(
            {
                "id": log.id,
                "entry": log.entry_json,
                "entry_hash": log.entry_hash,
                "prev_hash": log.prev_hash,
                "created_at": log.created_at,
            }
        )

    return {"count": len(output), "logs": output}


@router.get("/verify")
async def verify_my_audit_chain(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ok, errors = await verify_audit_chain(db, current_user.id)
    if not ok:
        raise HTTPException(status_code=409, detail={"errors": errors})
    return {"valid": True, "count": len(errors)}
