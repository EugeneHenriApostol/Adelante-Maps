from jose import jwt
from datetime import datetime, timedelta, timezone
import security

 # create email verification token
def create_verification_token(email: str):
    expire = datetime.now(timezone.utc) + timedelta(minutes=45) # token expires in 45 min
    to_encode = {"sub": email, "exp": expire}
    return jwt.encode(to_encode, security.SECRET_KEY, algorithm=security.ALGORITHM)

# create reset password token
def generate_reset_password_token(email: str):
    expire = datetime.now(timezone.utc) + timedelta(minutes=45) # token expires in 45 min
    to_encode = {"sub": email, "exp": expire}
    return jwt.encode(to_encode, security.SECRET_KEY, algorithm=security.ALGORITHM)

