from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
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
            "cluster": student.cluster,
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
            "cluster": student.cluster,
        }
        for student in students
    ]

# api to get all senior high students from the database for clustering
@get_students_api_router.get('/api/senior-high-student-data')
def get_senior_high_student_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.SeniorHighStudents)

    students = query.all()

    return [
        {
            "year": student.year,
            "strand": student.strand,
            "previous_school": student.previous_school,
            "age": student.age,
            "latitude": student.latitude,
            "longitude": student.longitude,
            "cluster": student.cluster,
        }
        for student in students
    ]

# api to get all college students from the database for clustering
@get_students_api_router.get('/api/college-student-data')
def get_college_student_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.CollegeStudents)

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
            "cluster": student.cluster,
        }
        for student in students
    ]

# retrieve top 10 schools with most students
@get_students_api_router.get('/api/students/all-schools')
def get_top_schools_with_students(db: Session = Depends(get_db)):
    schools = db.query(models.PreviousSchool).options(
        joinedload(models.PreviousSchool.students_senior_high),
        joinedload(models.PreviousSchool.students_college)
    ).all()

    school_map = {}

    for school in schools:
        clean_name = school.name.strip().lower()
        
        if clean_name == "unknown" or not clean_name:
            continue  # skip unknown schools

        key = (clean_name, round(school.latitude, 4), round(school.longitude, 4))

        if key not in school_map:
            school_map[key] = {
                "id": school.previousSchool_id,
                "name": school.name,
                "latitude": school.latitude,
                "longitude": school.longitude,
                "students_senior_high": [],
                "students_college": []
            }

        school_map[key]["students_senior_high"].extend(school.students_senior_high)
        school_map[key]["students_college"].extend(school.students_college)

    return list(school_map.values())
