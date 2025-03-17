from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
import auth, schemas

upload_db_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

@upload_db_router.get('/upload/student-data')
def upload_student_data_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_admin)):
    if current_user.role_id not in [2, 3]:
        return RedirectResponse(url="/maps", status_code=303)
    else:
        return templates.TemplateResponse("upload-db.html", {"request": request})