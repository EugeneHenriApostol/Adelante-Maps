from jose import jwt
from datetime import datetime, timedelta, timezone
import security

 # create email verification token

def create_verification_token(email: str):
    expire = datetime.now(timezone.utc) + timedelta(minutes=30) # token expires in 30 min
    to_encode = {"sub": email, "exp": expire}
    return jwt.encode(to_encode, security.SECRET_KEY, algorithm=security.ALGORITHM)