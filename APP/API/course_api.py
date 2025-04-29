from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
import models, schemas, auth

course_api_router = APIRouter()

@course_api_router.post('/api/courses', response_model=schemas.Course)
def create_course(course_data: schemas.CourseBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    existing = db.query(models.Course).filter_by(name=course_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail='Course already exists')
    
    course = models.Course(
        name = course_data.name,
        campus_id = course_data.campus_id
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@course_api_router.get('/api/retrieve/courses', response_model=List[schemas.CourseWithCampus])
def get_courses(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    return db.query(models.Course).options(joinedload(models.Course.campus)).all()

@course_api_router.put('/api/courses/{course_id}', response_model=schemas.Course)
def update_course(course_id: int, updated_data: schemas.CourseBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    course = db.query(models.Course).filter_by(course_id=course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.name = updated_data.name
    course.campus_id = updated_data.campus_id
    db.commit()
    db.refresh(course)
    return course

@course_api_router.delete('/api/courses/{course_id}')
def delete_course(course_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    course = db.query(models.Course).filter_by(course_id=course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}