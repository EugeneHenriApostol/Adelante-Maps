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
    # check if file is csv
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail='Invalid file type. Only CSV files are allowed.')
    
    # read and decode csv content
    try:
        content = await file.read()
        csv_data = csv.DictReader(StringIO(content.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to read CSV file {str(e)}')
    
    # parse and insert student data to database
    students = []
    for row in csv_data:
        try:
            prev_school = db.query(models.PreviousSchool).filter(models.PreviousSchool.name == row['previous_school']).first()

            if not prev_school:
                prev_school = models.PreviousSchool(
                    name = row['previous_school'],
                    latitude = float(row['latitude']),
                    longitude = float(row['longitude'])
                )

                db.add(prev_school)
                db.commit()
                db.refresh(prev_school)

            student = models.SeniorHighStudents(
                stud_id = int(row['stud_id']),
                year = int(row['year']),
                strand = row['strand'],
                age = int(row['age']),
                previous_school = prev_school,
                city = row['city'],
                province = row['province'],
                barangay = row['barangay'],
                full_address = row['full_address'],
                latitude = float(row['latitude']),
                longitude = float(row['longitude']),
                cluster_address = int(row['cluster_address']),
                cluster_proximity = int(row['cluster_proximity'])
                if row['cluster_proximity'] else None,
                previous_school_id=prev_school.id
            )
            students.append(student)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'Invalid data in row: {row}. Error: {str(e)}')
        
    # insert to database
    db.add_all(students)
    db.commit()

    return {'message': f'Successfully uploaded Senior High School Student Data. Rows inserted: {len(students)}'}


# upload college students data to database
@upload_db_api_router.post('/api/upload/college-data')
async def upload_college_data(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    # check if file is csv
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail='Invalid file type. Only CSV files are allowed.')
    
    # read and decode csv content
    try:
        content = await file.read()
        csv_data = csv.DictReader(StringIO(content.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to read CSV file {str(e)}')
    
    # parse and insert student data to database
    students = []
    for row in csv_data:
        try:
            student = models.CollegeStudents(
                stud_id=int(row["stud_id"]),
                year=int(row["year"]),
                course=row["course"],
                strand=row["strand"],
                age=int(row["age"]),
                previous_school=row["previous_school"],
                city=row["city"],
                province=row["province"],
                barangay=row["barangay"],
                full_address=row["full_address"],
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                cluster_address=int(row["cluster_address"]),  
                cluster_proximity=int(float(row["cluster_proximity"])) if row["cluster_proximity"] else None,
            )
            students.append(student)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid data in row: {row}. Error: {str(e)}")

    # insert to database
    db.add_all(students)
    db.commit()

    return {'message': f'Successfully uploaded College Student Data. Rows inserted: {len(students)}'}

# remove senior high student data endpoint
@upload_db_api_router.post("/api/remove-senior-high-data")
async def remove_senior_high_data(
    db: Session = Depends(get_db),
    current_user: schemas.UserInDBBase = Depends(auth.get_current_admin) 
):
    db.query(models.SeniorHighStudents).delete()
    db.commit()
    return {"message": "All senior high student data has been removed."}

# remove college data endpoint
@upload_db_api_router.post("/api/remove-college-data")
async def remove_college_data(
    db: Session = Depends(get_db),
    current_user: schemas.UserInDBBase = Depends(auth.get_current_admin)  
):
    db.query(models.CollegeStudents).delete()
    db.commit()
    return {"message": "All college student data has been removed."}