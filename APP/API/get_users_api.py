from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import models, auth
from database import get_db

get_users_api_router = APIRouter()

@get_users_api_router.get("/users")
def get_users(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(5, alias="limit"),  # number of users per page
    offset: int = Query(0, alias="offset")  # where to start fetching users
):
    total_users = db.query(models.User).count()  # get total users count
    users = db.query(models.User).filter(models.User.email != current_user.email).offset(offset).limit(limit).all()
    return {"total_users": total_users, "users": users}
