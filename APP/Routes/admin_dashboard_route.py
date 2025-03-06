
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

admin_dashboard_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve admin dashboard html
@admin_dashboard_router.get("/admin-dashboard")
def admin_dashboard_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user.role_id not in [2, 3]:
        return templates.TemplateResponse("maps.html", {"request": request})
    else:
        return templates.TemplateResponse("admin-dashboard.html", {"request": request})