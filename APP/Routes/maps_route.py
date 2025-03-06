# maps_route.py
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

maps_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve maps html
@maps_router.get("/maps")
def maps_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user:
        return templates.TemplateResponse("maps.html", {"request": request})