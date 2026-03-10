# backend/auth_utils.py
# Password hashing with bcrypt + JWT token generation

import bcrypt
import jwt
import os
from datetime import datetime, timedelta

SECRET_KEY = os.environ.get("SECRET_KEY", "eengage-secret-key-change-in-production")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24


# ── Password helpers ───────────────────────────────────────────────
def hash_password(plain: str) -> str:
    """Hash a plain password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ────────────────────────────────────────────────────
def create_token(user_id: int, email: str, role: str) -> str:
    """Create a signed JWT token valid for 24 hours."""
    payload = {
        "sub":   str(user_id),
        "email": email,
        "role":  role,
        "exp":   datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token. Returns payload or raises."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
