import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.server_keys import SERVER_PRIVATE_KEY
from app.models import TamperLog


async def record_audit_log(
    db: AsyncSession,
    request: Request,
    user_id: Optional[str],
    action: str,
    details: Optional[Dict[str, Any]] = None,
):
    client_ip = request.headers.get("X-Forwarded-For")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    user_agent = request.headers.get("User-Agent", "unknown")

    entry_json = {
        "action": action,
        "details": details or {},
        "timestamp": datetime.now().isoformat(),
        "ip": client_ip,
        "user_agent": user_agent,
        "path": request.url.path,
        "method": request.method,
    }

    result = await db.execute(
        select(TamperLog.entry_hash)
        .where(TamperLog.user_id == user_id)
        .order_by(TamperLog.created_at.desc())
        .limit(1)
    )
    prev_hash = result.scalar_one_or_none()

    payload = json.dumps(entry_json, sort_keys=True).encode()
    if prev_hash:
        payload += prev_hash.encode()
    entry_hash = hashlib.sha256(payload).hexdigest()

    signature = SERVER_PRIVATE_KEY.sign(
        entry_hash.encode(),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )

    entry = TamperLog(
        user_id=user_id,
        entry_json=entry_json,
        entry_hash=entry_hash,
        prev_hash=prev_hash,
        signature=signature,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return entry
