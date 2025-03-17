# seniorhigh_student_route.py
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import auth, schemas

seniorhigh_student_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve college student html
@seniorhigh_student_router.get("/seniorhigh-student/list")
def seniorhigh_student_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_admin)):
    if current_user.role_id not in [2, 3]:
        return templates.TemplateResponse("maps.html", {"request": request})
    else:
        return templates.TemplateResponse("seniorhigh_student_list.html", {"request": request})