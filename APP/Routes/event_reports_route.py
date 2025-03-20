
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

event_reports_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

@event_reports_router.get("/event-reports")
def maps_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user:
        return templates.TemplateResponse("event-reports.html", {"request": request})