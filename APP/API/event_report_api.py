from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
import models, auth, schemas
from database import get_db

event_reports_api_router = APIRouter()

# api to make event reports
@event_reports_api_router.post('/api/affected-areas', response_model=schemas.AffectedArea)
def create_affected_area(affected_area_data: schemas.AffectedAreaBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
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

# api to retrieve event reports table 
@event_reports_api_router.get('/api/event-reports/table', response_model=schemas.PaginatedResponse)
def get_event_reports_paginated(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    page: int = Query(1, alias="page", description="Page number"),
    per_page: int = Query(10, alias="per_page", description="Reports per page")
):
    # Filter by current user
    query = db.query(models.EventReports).filter(models.EventReports.user_id == current_user.user_id)

    total = query.count()

    reports = (
        query
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return schemas.PaginatedResponse(
        reports=[
            schemas.AffectedArea(
                event_id=report.event_id,
                user_id=report.user_id,
                type=report.event_type,
                total_area=report.total_area,
                number_of_students_affected=report.number_of_students_affected,
                geojson_data=report.geojson_data,
                clustering_type=report.clustering_type,
                education_level=report.education_level,
                created_at=report.created_at
            )
            for report in reports
        ],
        total=total
    )



# api to retrieve event reports for charts 
@event_reports_api_router.get('/api/event-reports/charts', response_model=List[schemas.AffectedArea])
def get_all_event_reports(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Filter by the current user's ID
    reports = db.query(models.EventReports).filter(models.EventReports.user_id == current_user.user_id).all()

    return [
        schemas.AffectedArea(
            event_id=report.event_id,
            user_id=report.user_id,
            type=report.event_type,
            total_area=report.total_area,
            number_of_students_affected=report.number_of_students_affected,
            geojson_data=report.geojson_data,
            clustering_type=report.clustering_type,
            education_level=report.education_level,
            created_at=report.created_at
        )
        for report in reports
    ]


# API to delete an event report by ID
@event_reports_api_router.delete('/api/event-reports/{report_id}', status_code=204)
def delete_event_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    report = db.query(models.EventReports).filter(models.EventReports.event_id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Ensure only the owner of the report can delete it
    if report.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")

    db.delete(report)
    db.commit()

    return Response(status_code=204)


# api to retrieve and render geojson (shape) on the map.
@event_reports_api_router.get('/api/event-reports/{report_id}')
def get_event_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    report = db.query(models.EventReports).filter(models.EventReports.event_id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Event report not found")
    
    return {
        "id": report.event_id,
        "type": report.event_type,
        "geojson": report.geojson_data,   
        "number_of_students_affected": report.number_of_students_affected,
        "total_area": report.total_area,
        "clustering_type": report.clustering_type,
        "education_level": report.education_level,
        "created_at": report.created_at
    }