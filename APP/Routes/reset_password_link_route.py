#reset_password_link_router.py

from fastapi import APIRouter, Query, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
import security

reset_password_link_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

@reset_password_link_router.get("/reset-password-link")
async def reset_password_page(request: Request, token: str = Query(...)):
    email = security.verify_reset_password_token(token)
    if not email:
        return RedirectResponse(url="/reset-password-expired")

    return templates.TemplateResponse("reset-password-link.html", {"request": request, "token": token})

@reset_password_link_router.get("/reset-password-expired")
async def reset_password_expired_page(request: Request):
    return templates.TemplateResponse("reset-link-expired.html", {"request": request})
