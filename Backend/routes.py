# routes.py

from typing import Optional
from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import auth, models, schemas, security

router = APIRouter()

templates = Jinja2Templates(directory="HTML")
router.mount("/static", StaticFiles(directory="static"), name="static")

# route to serve register.html
@router.get("/register")
def register_page(request: Request, current_user: Optional[schemas.UserInDBBase] = Depends(auth.get_optional_user)):
    # check if user is already authenticated or logged in
    if current_user:
        return templates.TemplateResponse("maps.html", {"request": request})
    else:
        return templates.TemplateResponse("register.html", {"request": request})