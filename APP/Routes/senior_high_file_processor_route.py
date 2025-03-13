from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
import auth, schemas

senior_high_file_processor_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

@senior_high_file_processor_router.get('/seniorhigh/file/processor')
def seniorhigh_file_processor_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user.role_id not in [2, 3]:
        return RedirectResponse(url="/maps", status_code=303)
    else:
        return templates.TemplateResponse("seniorhigh-file-processor.html", {"request": request})