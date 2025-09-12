import base64
import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings


# --- AES-GCM Encryption / Decryption ---

AES_KEY = settings.VAULTX_ENCRYPTION_KEY.encode()
if len(AES_KEY) != 32:
    raise ValueError("VAULTX_ENCRYPTION_KEY must be exactly 32 bytes long")


def encrypt_string(plaintext: str) -> str:
    if plaintext is None:
        return None

    aesgcm = AESGCM(AES_KEY)
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

    # store nonce + ciphertext together
    data = nonce + ciphertext
    return base64.b64encode(data).decode()


def decrypt_string(ciphertext_b64: str) -> str:
    if ciphertext_b64 is None:
        return None

    data = base64.b64decode(ciphertext_b64.encode())
    nonce, ciphertext = data[:12], data[12:]
    aesgcm = AESGCM(AES_KEY)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)

    return plaintext.decode()


# --- Hashing ---


def sha256_hash(value: str) -> str:
    if value is None:
        return None
    return hashlib.sha256(value.encode()).hexdigest()
