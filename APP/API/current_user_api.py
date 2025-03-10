# current_user_api.py

from fastapi import APIRouter, Depends
import models, auth

user_info_api_router = APIRouter()

# api to retrieve logged in user
@user_info_api_router.get("/current-user")
def get_current_user(current_user: models.User = Depends(auth.get_current_admin)):
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role_id": current_user.role_id
    }