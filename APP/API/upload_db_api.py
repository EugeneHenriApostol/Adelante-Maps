# upload senior high students data api endpoint
import csv
from io import StringIO
from fastapi import File, HTTPException, UploadFile

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import auth, models, schemas
from database import get_db

upload_db_api_router = APIRouter()

# upload senior high students data to database
@upload_db_api_router.post('/api/upload/senior-high-data')
async def upload_senior_high_data(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail='Invalid file type. Only CSV files are allowed.')

    try:
        content = await file.read()
        file_size = len(content) / 1024
        csv_data = csv.DictReader(StringIO(content.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to read CSV file {str(e)}')

    students = []
    for row in csv_data:
        try:
            prev_school = db.query(models.PreviousSchool).filter(models.PreviousSchool.name == row['previous_school']).first()

            if not prev_school:
                prev_school = models.PreviousSchool(
                    name=row['previous_school'],
                    latitude=float(row['prev_latitude']),
                    longitude=float(row['prev_longitude'])
                )
                db.add(prev_school)
                db.commit()
                db.refresh(prev_school)

            # strand
            strand = db.query(models.Strand).filter(models.Strand.name == row['strand']).first()
            if not strand:
                strand = models.Strand(name=row['strand'], campus_id=None)
                db.add(strand)
                db.commit()
                db.refresh(strand)

            student = models.SeniorHighStudents(
                stud_id=int(row['stud_id']),
                year=int(row['year']),
                strand=row['strand'],
                age=int(row['age']),
                city=row['city'],
                province=row['province'],
                barangay=row['barangay'],
                full_address=row['full_address'],
                latitude=float(row['latitude']),
                longitude=float(row['longitude']),
                cluster=int(row['cluster']) if row['cluster'] else None,
                previous_school_id=prev_school.previousSchool_id,
                strand_id = strand.strand_id
            )
            
            if prev_school.previousSchool_id:  # if it already exists in db
                student.previous_school_id = prev_school.previousSchool_id
            else:
                # handle db relationship first before committing to db
                student.previous_school = prev_school
                
            students.append(student)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'Invalid data in row: {row}. Error: {str(e)}')

    db.add_all(students)
    
    # create activity log
    log_entry = models.UserActivityLog(
        user_id=current_user.user_id,
        activity_type="csv_upload",
        target_table="senior_high_students",
        file_name=file.filename,
        record_count=len(students),
        file_size=file_size
    )
    
    db.add(log_entry)
    db.commit()

    return {'message': f'Successfully uploaded Senior High School Student Data. Rows inserted: {len(students)}'}



# upload college students data to database
@upload_db_api_router.post('/api/upload/college-data')
async def upload_college_data(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail='Invalid file type. Only CSV files are allowed.')

    try:
        content = await file.read()
        file_size = len(content) / 1024
        csv_data = csv.DictReader(StringIO(content.decode('utf-8')))
        
        rows = list(csv_data)
        row_count = len(rows)
        
        csv_data = csv.DictReader(StringIO(content.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to read CSV file {str(e)}')

    students = []
    for row in csv_data:
        try:
            prev_school = db.query(models.PreviousSchool).filter(models.PreviousSchool.name == row['previous_school']).first()

            if not prev_school:
                prev_school = models.PreviousSchool(
                    name=row['previous_school'],
                    latitude=float(row['prev_latitude']),
                    longitude=float(row['prev_longitude'])
                )
                db.add(prev_school)
                db.commit()
                db.refresh(prev_school)

            # course
            course = db.query(models.Course).filter(models.Course.name == row['course']).first()
            if not course:
                course = models.Course(name=row['course'], campus_id = None)
                db.add(course)
                db.commit()
                db.refresh(course)

            student = models.CollegeStudents(
                stud_id=int(row['stud_id']),
                year=int(row['year']),
                course=row['course'],
                age=int(row['age']),
                strand=row['strand'],
                city=row['city'],
                province=row['province'],
                barangay=row['barangay'],
                full_address=row['full_address'],
                latitude=float(row['latitude']),
                longitude=float(row['longitude']),
                cluster=int(row['cluster']) if row['cluster'] else None,
                previous_school_id=prev_school.previousSchool_id,
                course_id = course.course_id,
            )
            
            if prev_school.previousSchool_id:  # if it already exists in db
                student.previous_school_id = prev_school.previousSchool_id
            else:
                # handle db relationship first before committing to db
                student.previous_school = prev_school
             
            students.append(student)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'Invalid data in row: {row}. Error: {str(e)}')

    db.add_all(students)
    # log activity
    log_entry = models.UserActivityLog(
        user_id=current_user.user_id,
        activity_type="csv_upload",
        target_table="college_students",
        file_name=file.filename,
        record_count=len(students),
        file_size=file_size
    )
    db.add(log_entry)
    db.commit()

    return {'message': f'Successfully uploaded College Student Data. Rows inserted: {len(students)}'}


@upload_db_api_router.post("/api/remove-all-student-data")
async def remove_all_student_data(
    db: Session = Depends(get_db),
    current_user: schemas.UserInDBBase = Depends(auth.get_current_admin)
):

    senior_high_count = db.query(models.SeniorHighStudents).count()
    college_count = db.query(models.CollegeStudents).count()
    previous_school_count = db.query(models.PreviousSchool).count()

    db.query(models.SeniorHighStudents).delete()
    db.query(models.CollegeStudents).delete()
    db.query(models.PreviousSchool).delete()

    logs = [
        models.UserActivityLog(
            user_id=current_user.user_id,
            activity_type="data_delete",
            target_table="senior_high_students",
            record_count=senior_high_count,
        ),
        models.UserActivityLog(
            user_id=current_user.user_id,
            activity_type="data_delete",
            target_table="college_students",
            record_count=college_count,
        ),
        models.UserActivityLog(
            user_id=current_user.user_id,
            activity_type="data_delete",
            target_table="previous_schools",
            record_count=previous_school_count,
        ),
    ]
    db.add_all(logs)
    db.commit()

    return {
        "message": "All student and previous school data removed successfully.",
        "details": {
            "senior_high_deleted": senior_high_count,
            "college_deleted": college_count,
            "previous_schools_deleted": previous_school_count,
        }
    }