# login_api.py

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import auth, security
from database import get_db
from datetime import timedelta

login_api_router = APIRouter()

@login_api_router.post("/api/login")
def login_for_access_token(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.get_user(db, email=form_data.username)
    if not user or not security.pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # prevents javaScript from accessing the cookie
        secure=True,  # ensures the cookie is only sent over HTTPS
        samesite="Lax",  # prevents CSRF attacks
        expires=access_token_expires.total_seconds()  # token expiration
    )

    # return role_id in JSON but not the token
    return {
        "role_id": user.role_id  # send only role_id to frontend
    }

    # return {"access_token": access_token, "token_type": "bearer"}

# logout api endpoint
@login_api_router('/api/logout')
def logout(response: Response):
    response.delete_cookie('access_token')
    return {'message': 'Successfully logged out.'}