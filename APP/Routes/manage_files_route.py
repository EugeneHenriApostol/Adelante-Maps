# manage_files_route.py
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

manage_files_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve manage files html
@manage_files_router.get("/manage-files")
def admin_dashboard_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user.role_id not in [2, 3]:
        return templates.TemplateResponse("maps.html", {"request": request})
    else:
        return templates.TemplateResponse("manage-files.html", {"request": request})