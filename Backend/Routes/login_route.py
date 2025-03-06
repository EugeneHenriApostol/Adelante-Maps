# login_route.py

from typing import Optional
from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.templating import Jinja2Templates
import auth, models, schemas, security

login_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve login.html
@login_router.get("/login")
def login_page(request: Request, current_user: Optional[schemas.UserInDBBase] = Depends(auth.get_optional_user)):
    # check if user is already authenticated or logged in
    if current_user:
        return templates.TemplateResponse("maps.html", {"request": request})
    else:
        return templates.TemplateResponse("login.html", {"request": request})