from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db import get_db

router = APIRouter(prefix="/user", tags=["user"])


class IndexStateUpdate(BaseModel):
    index_state_ciphertext: str
    index_state_iv: str


class IndexStateResponse(BaseModel):
    index_state_ciphertext: str | None
    index_state_iv: str | None


@router.post("/index_state", response_model=dict)
async def update_index_state(
    payload: IndexStateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    current_user.index_state_ciphertext = payload.index_state_ciphertext.encode()
    current_user.index_state_iv = payload.index_state_iv.encode()

    await db.commit()
    return {"updated": True}


@router.get("/index_state", response_model=IndexStateResponse)
async def get_index_state(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return IndexStateResponse(
        index_state_ciphertext=(
            current_user.index_state_ciphertext.decode()
            if current_user.index_state_ciphertext
            else None
        ),
        index_state_iv=(
            current_user.index_state_iv.decode()
            if current_user.index_state_iv
            else None
        ),
    )
