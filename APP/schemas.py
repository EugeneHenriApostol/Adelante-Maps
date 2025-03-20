# schemas.py is defines the pydantic models
# pydantic models are responsible for telling the API how the request body should look like

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class Role(BaseModel):
    role_id: int
    role_name: str

class User(BaseModel):
    email: str
    first_name: str
    last_name: str
    role_id: Optional[int] = None

# we do it this class like this because in the api we want the user to pass in the normal password as a normal string, normal password for the api
# in the database we will have a hashed version of this password, so i create two kind of different classes, the database version and the api
# normal class for the api
class UserIn(User):
    password: str 

class UserInDBBase(User):
    role_id: int

    class Config:
        from_attributes = True

# class in database with the hashed password
# class for the database
class UserInDB(UserInDBBase):
    hashed_password: str 

class TokenData(BaseModel):
    email: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class ResetPassword(BaseModel):
    token: str
    new_password: str

class AffectedAreaBase(BaseModel):
    type: str
    number_of_students_affected: int
    total_area: float
    geojson_data: dict
    clustering_type: Optional[str] = None 
    education_level: Optional[str] = None 
    created_at: Optional[datetime] = datetime.now()
    
class AffectedArea(AffectedAreaBase):
    event_id: int
    user_id: int

    class Config:
        from_attributes = True

class PaginatedResponse(BaseModel):
    reports: List[AffectedArea]  
    total: int

class ChatRequest(BaseModel):
    message: str
    history: list[str]  