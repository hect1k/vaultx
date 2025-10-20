import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

CHUNK_SIZE = 64 * 1024  # 64KB


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
