from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, auth
from database import get_db

get_students_api_router = APIRouter()

@get_students_api_router.get("/api/senior-high-students")
def get_senior_high_students(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin),
    page: int = 1,
    page_size: int = 10
):
    offset = (page - 1) * page_size
    students = db.query(models.SeniorHighStudents).offset(offset).limit(page_size).all()
    total_students = db.query(models.SeniorHighStudents).count()

    return {
        "students": [
            {
                "year": student.year,
                "strand": student.strand,
                "previous_school": student.previous_school,
                "age": student.age,
                "full_address": student.full_address,
            }
            for student in students
        ],
        "total": total_students,
        "page": page,
        "page_size": page_size
    }

@get_students_api_router.get("/api/college-students")
def get_college_students(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin),
    page: int = 1,
    page_size: int = 10
):
    offset = (page - 1) * page_size
    students = db.query(models.CollegeStudents).offset(offset).limit(page_size).all()
    total_students = db.query(models.CollegeStudents).count()

    return {
        "students": [
            {
                "year": student.year,
                "course": student.course,
                "strand": student.strand,
                "previous_school": student.previous_school,
                "age": student.age,
                "full_address": student.full_address,
            }
            for student in students
        ],
        "total": total_students,
        "page": page,
        "page_size": page_size
    }


@get_students_api_router.get("/api/senior-high-students/count")
def get_senior_high_student_count(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    count = db.query(models.SeniorHighStudents).count()
    return {"count": count}

@get_students_api_router.get("/api/college-students/count")
def get_college_student_count(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    count = db.query(models.CollegeStudents).count()
    return {"count": count}

# get all seniorhigh students
@get_students_api_router.get("/api/senior-high-students/all")
def get_all_senior_high_students(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
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