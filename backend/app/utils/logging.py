import asyncio
import hashlib
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import Log
from app.utils.crypto import encrypt_data


def log_action(
    db: Session,
    user_email: str,
    action: str,
    extra_details: Optional[str] = None,
):
    details_plain = f"user={user_email}; action={action}; {extra_details or ''}"

    details_encrypted = encrypt_data(details_plain)

    prev_log = db.query(Log).order_by(Log.id.desc()).first()
    prev_hash = prev_log.hash if prev_log else None

    now_iso = datetime.now().isoformat()
    content_for_hash = f"{prev_hash or ''} {details_plain} {now_iso}"
    current_hash = hashlib.sha256(content_for_hash.encode()).hexdigest()

    log = Log(
        timestamp=datetime.now(), details_enc=details_encrypted, hash=current_hash
    )
    db.add(log)
    db.commit()


async def log_action_async(*args, **kwargs):
    await asyncio.to_thread(log_action, *args, **kwargs)


# TODO: Log IP, User Agent, etc
# TODO: Logging endpoints
