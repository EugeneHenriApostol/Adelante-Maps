from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import models, security, schemas
from database import get_db

# oauth2 scheme serves as dependency injection
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login") # token url is responsible for returning jwt

# helper functionality
# used as a dependency injection
def get_user(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

# this is also used as a dependency injection
def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token") 
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
        )
    
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user

# optional authentication for log in and register route    
def get_optional_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")

    if not token:
        authorization: Optional[str] = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer"):
            token = authorization.split("Bearer")[1].strip()
    
    if not token:
        return None
    
    try:
        return get_current_user(token, db)
    except:
        return None