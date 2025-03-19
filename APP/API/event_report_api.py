from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, auth, schemas
from database import get_db

event_reports_api_router = APIRouter()

@event_reports_api_router.post('/api/affected-areas', response_model=schemas.AffectedArea)
def create_affected_area(affected_area_data: schemas.AffectedAreaBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    affected_area = models.EventReports(
        user_id=current_user.user_id,  # Set current user's ID
        event_type=affected_area_data.type,
        total_area=affected_area_data.total_area,
        number_of_students_affected=affected_area_data.number_of_students_affected,
        geojson_data=affected_area_data.geojson_data,
        clustering_type=affected_area_data.clustering_type,  
        education_level=affected_area_data.education_level   
    )

    db.add(affected_area)
    db.commit()
    db.refresh(affected_area)

    return schemas.AffectedArea(
        event_id=affected_area.event_id,
        user_id=affected_area.user_id,
        type=affected_area.event_type,
        total_area=affected_area.total_area,
        number_of_students_affected=affected_area.number_of_students_affected,
        geojson_data=affected_area.geojson_data,
        clustering_type=affected_area_data.clustering_type,  
        education_level=affected_area_data.education_level   
    )