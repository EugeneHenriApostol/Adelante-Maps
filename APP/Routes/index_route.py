
from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

index_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve index.html
@index_router.get("/")
def index_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})