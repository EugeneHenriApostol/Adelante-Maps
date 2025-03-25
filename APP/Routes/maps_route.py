# maps_route.py
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.templating import Jinja2Templates
from API.chatbot_api import chatbot_api_router, chat_endpoint
import auth, schemas

maps_router = APIRouter()

templates = Jinja2Templates(directory="HTML")

# route to serve maps html
@maps_router.get("/maps")
def maps_page(request: Request, current_user: schemas.UserInDBBase = Depends(auth.get_current_user)):
    if current_user:
        return templates.TemplateResponse("maps.html", {"request": request})

@maps_router.post("/maps/chat")
async def maps_chat(request: schemas.ChatRequest):
    try:
        return await chat_endpoint(request)  # Ensure this function is correctly defined
    except Exception as e:
        print(f"Chatbot error: {e}")  # Print error to console
        raise HTTPException(status_code=500, detail="Internal Server Error")