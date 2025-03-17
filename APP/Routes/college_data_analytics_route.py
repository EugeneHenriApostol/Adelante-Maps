
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

college_analytics_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

@college_analytics_router.get("/college/data-analytics")
def college_analytics_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user:
        return templates.TemplateResponse("college-data-analytics.html", {"request": request})