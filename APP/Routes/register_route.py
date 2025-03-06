# register_route.py

from typing import Optional
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
import auth, schemas

register_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve register.html
@register_router.get("/register")
def register_page(request: Request, current_user: Optional[schemas.UserInDBBase] = Depends(auth.get_optional_user)):
    # check if user is already authenticated or logged in
    if current_user:
        return RedirectResponse(url="/maps", status_code=303)
    return templates.TemplateResponse("register.html", {"request": request})