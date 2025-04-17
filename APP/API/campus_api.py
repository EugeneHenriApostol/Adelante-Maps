from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth

campus_api_router = APIRouter()

@campus_api_router.post('/api/campuses', response_model=schemas.Campus)
def create_campus(campus_data: schemas.CampusBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):

    existing = db.query(models.Campus).filter_by(name=campus_data.name).first()

    if existing:
        raise HTTPException(status_code=400, detail="Campus with this name already exists")
    
    campus = models.Campus(
        name=campus_data.name,
        latitude=campus_data.latitude,
        longitude=campus_data.longitude,
        user_id=current_user.user_id
    )

    db.add(campus)
    
    # create activity log entry
    log_entry = models.UserActivityLog(
        user_id=current_user.user_id,
        activity_type="create",
        target_table="campuses",
        record_count=1
    )
    db.add(log_entry)
    
    db.commit()
    db.refresh(campus)

    return campus

@campus_api_router.get('/api/retrieve/campuses', response_model=List[schemas.Campus])
def get_campuses(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    return db.query(models.Campus).all()

@campus_api_router.put("/api/campuses/{campus_id}", response_model=schemas.Campus)
def update_campus(campus_id: int, updated_data: schemas.CampusBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    existing_campus = db.query(models.Campus).filter(models.Campus.campus_id == campus_id).first()
    
    if not existing_campus:
        raise HTTPException(status_code=404, detail="Campus not found")
    
    existing_campus.name = updated_data.name
    existing_campus.latitude = updated_data.latitude
    existing_campus.longitude = updated_data.longitude

    db.commit()
    db.refresh(existing_campus)

    return existing_campus

@campus_api_router.delete('/api/campuses/{campus_id}')
def delete_campus(campus_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    campus = db.query(models.Campus).filter(models.Campus.campus_id == campus_id).first()

    if not campus:
        raise HTTPException(status_code=404, detail='Campus not found.')
    
    db.delete(campus)
    
    # create activity log entry
    log_entry = models.UserActivityLog(
        user_id=current_user.user_id,
        activity_type="delete",
        target_table="campuses",
        record_count=1
    )
    db.add(log_entry)
    
    db.commit()

    return {"message": "Campus successfully deleted."}