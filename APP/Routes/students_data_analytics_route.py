
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

students_analytics_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

@students_analytics_router.get("/students/data-analytics")
def students_analytics_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user:
        return templates.TemplateResponse("students-data-analytics.html", {"request": request})