# edit_users.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, auth, schemas
from database import get_db

edit_users_api_router = APIRouter()

@edit_users_api_router.put("/users/{user_id}")
def update_user(user_id: int, user_data: schemas.User, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.first_name = user_data.first_name
    user.last_name = user_data.last_name
    user.role_id = user_data.role_id

    if user_data.role_id is not None:
        user.role_id = user_data.role_id

    db.commit()
    db.refresh(user)
    return {"message": "User updated successfully", "user": user}