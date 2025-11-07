import hashlib
import json
from typing import List, Optional, Tuple

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.server_keys import SERVER_PUBLIC_KEY
from app.models import TamperLog


async def verify_audit_chain(db: AsyncSession, user_id) -> Tuple[bool, List[str]]:
    result = await db.execute(
        select(TamperLog)
        .where(TamperLog.user_id == user_id)
        .order_by(TamperLog.created_at.asc())
    )
    entries = result.scalars().all()

    if not entries:
        return True, []

    errors: List[str] = []
    prev_hash: Optional[str] = None

    for i, entry in enumerate(entries):
        entry_data = entry.entry_json
        entry_hash_val = str(entry.entry_hash)
        prev_hash_val = (
            str(entry.prev_hash) if getattr(entry, "prev_hash", None) else None
        )
        sig_raw = getattr(entry, "signature", None)

        payload = json.dumps(entry_data, sort_keys=True).encode()
        if prev_hash:
            payload += prev_hash.encode()
        computed_hash = hashlib.sha256(payload).hexdigest()

        if computed_hash != entry_hash_val:
            errors.append(
                f"Hash mismatch at entry {entry.id}: expected {computed_hash}, got {entry_hash_val}"
            )

        try:
            if not isinstance(SERVER_PUBLIC_KEY, rsa.RSAPublicKey):
                raise RuntimeError("Server public key is not RSA")

            SERVER_PUBLIC_KEY.verify(
                sig_raw,  # type: ignore
                entry_hash_val.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH,
                ),
                hashes.SHA256(),
            )
        except Exception as e:
            errors.append(f"Signature verification failed at entry {entry.id}: {e}")

        if i > 0 and prev_hash_val != prev_hash:
            errors.append(
                f"Broken chain at entry {entry.id}: prev_hash mismatch "
                f"(expected {prev_hash}, got {prev_hash_val})"
            )

        prev_hash = entry_hash_val

    return len(errors) == 0, errors
