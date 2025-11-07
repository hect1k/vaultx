#!/usr/bin/env python3
import os

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

KEY_DIR = "/etc/vaultx/keys"
PRIV_PATH = os.path.join(KEY_DIR, "server_signing_key.pem")
PUB_PATH = os.path.join(KEY_DIR, "server_signing_pub.pem")

os.makedirs(KEY_DIR, exist_ok=True)

# Generate RSA 4096-bit keypair
private_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)

# Save private key
with open(PRIV_PATH, "wb") as f:
    f.write(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

# Save public key
public_key = private_key.public_key()
with open(PUB_PATH, "wb") as f:
    f.write(
        public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )

os.chmod(PRIV_PATH, 0o600)
os.chmod(PUB_PATH, 0o644)

print(f"✅ Generated keypair:\n  Private: {PRIV_PATH}\n  Public:  {PUB_PATH}")
