from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, auth
from database import get_db

get_students_api_router = APIRouter()


@get_students_api_router.get("/api/senior-high-students/count")
def get_senior_high_student_count(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    count = db.query(models.SeniorHighStudents).count()
    return {"count": count}

@get_students_api_router.get("/api/college-students/count")
def get_college_student_count(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    count = db.query(models.CollegeStudents).count()
    return {"count": count}

# get all seniorhigh students
@get_students_api_router.get("/api/senior-high-students/all")
def get_all_senior_high_students(
    db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)
):
    students = db.query(models.SeniorHighStudents).all()
    
    return [
        {
            "year": student.year,
            "strand": student.strand,
            "previous_school": student.previous_school,
            "age": student.age,
            "latitude": student.latitude,
            "longitude": student.longitude,
            "cluster_address": student.cluster_address,
            "cluster_proximity": student.cluster_proximity,
        }
        for student in students
    ]

# get all college students
@get_students_api_router.get("/api/college-students/all")
def get_all_college_students(
    db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)
):
    students = db.query(models.CollegeStudents).all()
    
    return [
        {
            "year": student.year,
            "course": student.course,
            "strand": student.strand,
            "previous_school": student.previous_school,
            "age": student.age,
            "latitude": student.latitude,
            "longitude": student.longitude,
            "cluster_address": student.cluster_address,
            "cluster_proximity": student.cluster_proximity,
        }
        for student in students
    ]

# api to get all senior high students from the database for clustering
@get_students_api_router.get('/api/senior-high-student-data')
def get_senior_high_student_data(
    cluster_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.SeniorHighStudents)

    if cluster_type == "cluster_address":
        query = query.order_by(models.SeniorHighStudents.cluster_address)
    elif cluster_type == "cluster_proximity":
        query = query.order_by(models.SeniorHighStudents.cluster_proximity)

    students = query.all()

    return [
        {
            "year": student.year,
            "strand": student.strand,
            "previous_school": student.previous_school,
            "age": student.age,
            "latitude": student.latitude,
            "longitude": student.longitude,
            "cluster_address": student.cluster_address,
            "cluster_proximity": student.cluster_proximity,
        }
        for student in students
    ]

# api to get all college students from the database for clustering
@get_students_api_router.get('/api/college-student-data')
def get_college_student_data(
    cluster_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.CollegeStudents)

    if cluster_type == "cluster_address":
        query = query.order_by(models.CollegeStudents.cluster_address)
    elif cluster_type == "cluster_proximity":
        query = query.order_by(models.CollegeStudents.cluster_proximity)

    students = query.all()

    return [
        {
            "year": student.year,
            "course": student.course,
            "strand": student.strand,
            "previous_school": student.previous_school,
            "age": student.age,
            "latitude": student.latitude,
            "longitude": student.longitude,
            "cluster_address": student.cluster_address,
            "cluster_proximity": student.cluster_proximity,
        }
        for student in students
    ]