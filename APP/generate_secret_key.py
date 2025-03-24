import secrets

secret_key = secrets.token_hex(32)
print("Secret key:", secret_key)