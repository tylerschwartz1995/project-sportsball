#!/usr/bin/env python3
"""Write two scrypt password hashes to a new private file, never terminal output."""
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sys

if len(sys.argv) != 2:
    raise SystemExit("Usage: python3 scripts/hosted/create-login.py /private/new-file.json")
users = []
for number in (1, 2):
    username = input(f"User {number} name: ").strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", username) or any(u["username"] == username for u in users):
        raise SystemExit("Choose distinct usernames containing letters, numbers, underscores or hyphens.")
    password = getpass.getpass("Password (at least 16 characters): ")
    if len(password) < 16 or len(password) > 512 or password != getpass.getpass("Confirm password: "):
        raise SystemExit("Passwords must match and contain 16–512 characters.")
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1, dklen=64)
    users.append({"username": username, "salt": salt.hex(), "hash": digest.hex()})
path = Path(sys.argv[1])
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as stream:
    json.dump(users, stream)
print("Private login configuration written. Store passwords in your password manager.")
