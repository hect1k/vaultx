import base64
import hashlib
import os
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import Settings

settings = Settings()

CHUNK_SIZE = 64 * 1024  # 64KB
APP_LOGS_KEY = hashlib.sha256((settings.APP_SECRET_KEY + "LOGS").encode()).digest()
APP_EMAILS_KEY = hashlib.sha256((settings.APP_SECRET_KEY + "EMAILS").encode()).digest()


def hmac_compare(a: str, b: str) -> bool:
    if a == "" or b == "":
        return False
    return secrets.compare_digest(a, b)


def encrypt_email(email: str) -> str:
    email_bytes = email.lower().encode()
    aesgcm = AESGCM(APP_EMAILS_KEY)
    nonce = os.urandom(12)  # 12-byte nonce for AES-GCM
    ciphertext = aesgcm.encrypt(nonce, email_bytes, associated_data=None)
    combined = nonce + ciphertext
    return base64.b64encode(combined).decode()


def decrypt_email(ciphertext_b64: str) -> str:
    data = base64.b64decode(ciphertext_b64)
    nonce = data[:12]
    ct = data[12:]
    aesgcm = AESGCM(APP_EMAILS_KEY)
    return aesgcm.decrypt(nonce, ct, associated_data=None).decode()


def hash_email(email: str) -> str:
    return hashlib.sha256(email.lower().encode()).hexdigest()


def generate_aes_key():
    return AESGCM.generate_key(bit_length=256)


def encrypt_file_streamed(input_path: str, output_path: str, key: bytes):
    aesgcm = AESGCM(key)
    with open(input_path, "rb") as fin, open(output_path, "wb") as fout:
        while chunk := fin.read(CHUNK_SIZE):
            nonce = os.urandom(12)
            encrypted = aesgcm.encrypt(nonce, chunk, None)
            fout.write(len(nonce).to_bytes(2, "big") + nonce)
            fout.write(len(encrypted).to_bytes(4, "big") + encrypted)


def hash_keyword(keyword: str) -> str:
    return hashlib.sha256(keyword.encode()).hexdigest()


def decrypt_file_streamed(enc_path: str, key: bytes):
    aesgcm = AESGCM(key)
    with open(enc_path, "rb") as f:
        while True:
            len_nonce_bytes = f.read(2)
            if not len_nonce_bytes:
                break
            len_nonce = int.from_bytes(len_nonce_bytes, "big")
            nonce = f.read(len_nonce)

            len_cipher_bytes = f.read(4)
            if not len_cipher_bytes:
                break
            len_cipher = int.from_bytes(len_cipher_bytes, "big")
            ciphertext = f.read(len_cipher)

            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
            yield plaintext


def encrypt_data(plaintext: str) -> str:
    """
    Encrypts plaintext bytes using AES-256-GCM.
    Returns base64-encoded string (nonce + ciphertext + tag).
    """
    if len(APP_LOGS_KEY) != 32:
        raise ValueError("AES key must be 32 bytes for AES-256-GCM")

    aesgcm = AESGCM(APP_LOGS_KEY)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), associated_data=None)
    encrypted = nonce + ciphertext
    return base64.b64encode(encrypted).decode()


def decrypt_data(ciphertext_b64: str) -> str:
    """
    Decrypts a base64-encoded string produced by encrypt_data().
    Returns plaintext bytes.
    """
    if len(APP_LOGS_KEY) != 32:
        raise ValueError("AES key must be 32 bytes for AES-256-GCM")

    data = base64.b64decode(ciphertext_b64)
    nonce = data[:12]
    ct = data[12:]
    aesgcm = AESGCM(APP_LOGS_KEY)
    return aesgcm.decrypt(nonce, ct, associated_data=None).decode()
