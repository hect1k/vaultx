import base64
import json
import os
import sys
import time

import requests

BASE = "http://127.0.0.1:8000"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"


def hr(title):
    print(f"\n{CYAN}{'=' * 25} {title} {'=' * 25}{RESET}")


def pretty(r: requests.Response):
    print(f"{YELLOW}{r.request.method} {r.request.url}{RESET}")
    print(f"→ Status: {r.status_code}")
    try:
        js = r.json()
        print(json.dumps(js, indent=2))
    except Exception:
        print(r.text.strip() or "<no response body>")
    print()
    return r


def gen_b64(n=32):
    return base64.b64encode(os.urandom(n)).decode()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def step_ok(ok):
    print(f"{GREEN}✅ OK{RESET}" if ok else f"{RED}❌ FAIL{RESET}")


def register_user(email):
    hr(f"Register {email}")
    payload = {
        "email": email,
        "password": "password123",
        "public_key_b64": gen_b64(),
        "encrypted_private_key_b64": gen_b64(),
    }
    r = requests.post(f"{BASE}/auth/register", json=payload)
    pretty(r)
    step_ok(r.status_code == 200)
    return r


def login(email):
    hr(f"Login {email}")
    r = requests.post(
        f"{BASE}/auth/login", json={"email": email, "password": "password123"}
    )
    pretty(r)
    step_ok(r.status_code == 200)
    if r.ok:
        return r.json().get("access_token")
    sys.exit(1)


def upload_file(token):
    hr("Upload File")
    metadata_ciphertext = gen_b64()
    encrypted_kf_b64 = gen_b64()
    tokens_json = json.dumps(
        [{"token": gen_b64(8), "value": gen_b64(8), "prev_token": None}]
    )

    files = {
        "file": ("test.txt", b"Hello encrypted world!"),
        "metadata_ciphertext": (None, metadata_ciphertext),
        "encrypted_kf_b64": (None, encrypted_kf_b64),
        "tokens_json": (None, tokens_json),
    }

    r = requests.post(f"{BASE}/files/upload", files=files, headers=auth_header(token))
    pretty(r)
    step_ok(r.status_code == 200)
    if r.ok:
        return r.json()["id"], json.loads(tokens_json)
    sys.exit(1)


def list_files(token):
    hr("List Files")
    r = requests.get(f"{BASE}/files", headers=auth_header(token))
    pretty(r)
    step_ok(r.status_code == 200)
    return r


def share_file(token, file_id, recipient_email):
    hr(f"Share File with {recipient_email}")
    payload = {
        "file_id": file_id,
        "recipient_email": recipient_email,
        "wrapped_key_b64": gen_b64(32),
        "permissions": "read",
    }
    r = requests.post(f"{BASE}/shares", json=payload, headers=auth_header(token))
    pretty(r)
    step_ok(r.status_code == 200)
    if r.ok:
        return r.json()["id"]
    sys.exit(1)


def revoke_share(token, file_id, recipient_email):
    hr(f"Revoke Share with {recipient_email}")
    payload = {
        "file_id": file_id,
        "recipient_email": recipient_email,
    }
    r = requests.delete(f"{BASE}/shares", json=payload, headers=auth_header(token))
    pretty(r)
    step_ok(r.status_code == 200)


def my_shares(token):
    hr("My Shares (as recipient)")
    r = requests.get(f"{BASE}/shares/me", headers=auth_header(token))
    pretty(r)
    step_ok(r.status_code == 200)
    return r


def search_files(token, tokens):
    hr("Search Files")
    # simulate sending first token only for simplicity
    payload = {"token": tokens[0]["token"]}
    r = requests.post(f"{BASE}/search", json=payload, headers=auth_header(token))
    pretty(r)
    step_ok(r.status_code == 200)
    return r


def download_file(token, file_id):
    hr(f"Download File {file_id}")
    r = requests.get(f"{BASE}/files/{file_id}/download", headers=auth_header(token))
    print(f"{YELLOW}{r.request.method} {r.request.url}{RESET}")
    print(f"→ Status: {r.status_code}")
    if r.ok:
        print(f"Downloaded {len(r.content)} bytes.")
    else:
        print(r.text.strip() or "<no response body>")
    print()
    step_ok(r.status_code == 200)


def delete_file(token, file_id):
    hr(f"Delete File {file_id}")
    r = requests.delete(f"{BASE}/files/{file_id}", headers=auth_header(token))
    pretty(r)
    step_ok(r.status_code == 200)


def run():
    print(f"{CYAN}\n=== VaultX Backend Full Test ==={RESET}")
    start = time.time()

    register_user("alice@example.com")
    register_user("bob@example.com")

    alice_token = login("alice@example.com")
    bob_token = login("bob@example.com")

    file_id, tokens = upload_file(alice_token)
    list_files(alice_token)

    share_file(alice_token, file_id, "bob@example.com")
    my_shares(bob_token)

    search_files(alice_token, tokens)
    download_file(bob_token, file_id)

    delete_file(alice_token, file_id)
    revoke_share(alice_token, file_id, "bob@example.com")

    elapsed = time.time() - start
    print(f"{GREEN}\n🎉 All tests completed in {elapsed:.2f}s.{RESET}")


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\nInterrupted.")
