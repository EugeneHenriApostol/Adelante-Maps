from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, auth
from database import get_db

get_previous_schools_api_router = APIRouter()

@get_previous_schools_api_router.get('/api/previous-schools')
def get_all_previous_schools(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    schools = db.query(models.PreviousSchool).all()

    result = []
    for school in schools:
        senior_high_count = db.query(models.SeniorHighStudents).filter(models.SeniorHighStudents.previous_school_id == school.previousSchool_id).count()
        college_count = db.query(models.CollegeStudents).filter(models.CollegeStudents.previous_school_id == school.previousSchool_id).count()


        result.append({
            "id": school.previousSchool_id,
            "name": school.name,
            "latitude": school.latitude,
            "longitude": school.longitude,
            "senior_high_count": senior_high_count,
            "college_count": college_count
        })

    return result
