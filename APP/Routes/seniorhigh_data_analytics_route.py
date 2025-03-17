
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

seniorhigh_analytics_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

@seniorhigh_analytics_router.get("/seniorhigh/data-analytics")
def seniorhigh_analytics_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user:
        return templates.TemplateResponse("seniorhigh-data-analytics.html", {"request": request})