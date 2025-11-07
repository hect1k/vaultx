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
    try:
        os.chmod(path, 0o700)
    except PermissionError:
        pass


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
    try:
        os.chmod(path, mode)
    except PermissionError:
        pass


def _load_or_create_keys() -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    _ensure_dir(Path(KEYS_DIR))

    if PRIV_PATH.exists() and PUB_PATH.exists():
        priv = serialization.load_pem_private_key(PRIV_PATH.read_bytes(), password=None)
        pub = serialization.load_pem_public_key(PUB_PATH.read_bytes())
    else:
        _, priv_pem, pub_pem = _generate_rsa()
        try:
            _write_secure(PRIV_PATH, priv_pem, 0o600)
            _write_secure(PUB_PATH, pub_pem, 0o644)
        except PermissionError:
            fallback = Path(settings.fallback_keys_dir)
            _ensure_dir(fallback)
            fb_priv = fallback / "server_signing_key.pem"
            fb_pub = fallback / "server_signing_key.pub"
            _write_secure(fb_priv, priv_pem, 0o600)
            _write_secure(fb_pub, pub_pem, 0o644)
            priv = serialization.load_pem_private_key(
                fb_priv.read_bytes(), password=None
            )
            pub = serialization.load_pem_public_key(fb_pub.read_bytes())
        else:
            priv = serialization.load_pem_private_key(priv_pem, password=None)
            pub = serialization.load_pem_public_key(pub_pem)

    if not isinstance(priv, rsa.RSAPrivateKey):
        raise TypeError("Loaded private key is not RSA")
    if not isinstance(pub, rsa.RSAPublicKey):
        raise TypeError("Loaded public key is not RSA")
    return priv, pub


SERVER_PRIVATE_KEY, SERVER_PUBLIC_KEY = _load_or_create_keys()
