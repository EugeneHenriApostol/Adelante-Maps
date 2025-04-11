from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

file_process_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

@file_process_router.get("/file-process")
def file_process_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_admin)):
    if current_user.role_id not in [2, 3]:
        return templates.TemplateResponse("maps.html", {"request": request})
    else:
        return templates.TemplateResponse("files-process.html", {"request": request})