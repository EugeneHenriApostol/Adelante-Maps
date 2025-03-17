# forgot_password_route.py
from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

forgot_password_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve reset_password.html
@forgot_password_router.get("/forgot-password")
def forgot_password_page(request: Request):
    return templates.TemplateResponse("forgot-password.html", {"request": request})