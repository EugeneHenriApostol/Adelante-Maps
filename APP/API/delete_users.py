from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, auth, schemas
from database import get_db

delete_users_api_router = APIRouter()

@delete_users_api_router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}