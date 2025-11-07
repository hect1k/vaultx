import os
from pathlib import Path
from typing import Tuple

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.config import settings

KEYS_DIR = settings.keys_dir
PRIV_PATH = Path(KEYS_DIR) / "server_signing_key.pem"
PUB_PATH = Path(KEYS_DIR) / "server_signing_key.pub"


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    os.chmod(path, 0o700)


def _generate_rsa() -> Tuple[rsa.RSAPrivateKey, bytes, bytes]:
    key = rsa.generate_private_key(
        public_exponent=65537, key_size=3072, backend=default_backend()
    )
    priv_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    pub_pem = key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return key, priv_pem, pub_pem


def _write_secure(path: Path, data: bytes, mode: int = 0o600) -> None:
    path.write_bytes(data)
    os.chmod(path, mode)


def _load_or_create_keys() -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    main_dir = Path(KEYS_DIR)
    fallback_dir = Path(settings.fallback_keys_dir)

    try:
        _ensure_dir(main_dir)
    except PermissionError:
        _ensure_dir(fallback_dir)

    priv_path = main_dir / "server_signing_key.pem"
    pub_path = main_dir / "server_signing_key.pub"

    if not os.access(main_dir, os.W_OK):
        priv_path = fallback_dir / "server_signing_key.pem"
        pub_path = fallback_dir / "server_signing_key.pub"

    if priv_path.exists() and pub_path.exists():
        priv = serialization.load_pem_private_key(priv_path.read_bytes(), password=None)
        pub = serialization.load_pem_public_key(pub_path.read_bytes())
    else:
        key, priv_pem, pub_pem = _generate_rsa()
        _write_secure(priv_path, priv_pem, 0o600)
        _write_secure(pub_path, pub_pem, 0o644)
        priv, pub = key, key.public_key()

    if not isinstance(priv, rsa.RSAPrivateKey):
        raise TypeError("Loaded private key is not RSA")
    if not isinstance(pub, rsa.RSAPublicKey):
        raise TypeError("Loaded public key is not RSA")

    return priv, pub


SERVER_PRIVATE_KEY, SERVER_PUBLIC_KEY = _load_or_create_keys()
