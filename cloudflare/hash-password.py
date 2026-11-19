"""Generate a Cloudflare administrator password hash without echoing the password."""
import base64
import getpass
import hashlib
import os
import secrets
import sys

password = os.environ.get(sys.argv[1], "") if len(sys.argv) > 1 else getpass.getpass("Senha do administrador: ")
if len(password) < 12:
    raise SystemExit("Use ao menos 12 caracteres.")
salt = secrets.token_bytes(16)
key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 150000, 32)
print("pbkdf2$150000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(key).decode())
