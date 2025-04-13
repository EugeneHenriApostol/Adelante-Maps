from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
import models, auth, schemas
from database import get_db
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from io import BytesIO
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone

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
    # filter by current user
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

@event_reports_api_router.get("/api/event-reports/export/pdf")
async def export_event_reports_pdf(
    db: Session = Depends(get_db),
    current_user: schemas.UserInDBBase = Depends(auth.get_current_user)
):
    try:
        # get report for current user
        reports = db.query(models.EventReports).filter(
            models.EventReports.user_id == current_user.user_id
        ).all()

        if not reports:
            raise HTTPException(status_code=404, detail="No event reports found")

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # extract table data
        table_data = [
            ['Event Type', 'Students Affected', 'Total Area (km²)', 'Date', 'Clustering Type', 'Education Level']
        ]
        
        for report in reports:
            table_data.append([
                report.event_type or 'N/A',
                str(report.number_of_students_affected or 0),
                f"{report.total_area or 0:.2f}",
                report.created_at.strftime("%Y-%m-%d") if report.created_at else "N/A",
                report.clustering_type or 'N/A',
                report.education_level or 'N/A'
            ])

        # table pdf output
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#065F46")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 12),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#E6F2EF")),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))

        # build pdf
        doc.build([table])

        # prepare response
        buffer.seek(0)
        filename = f"event_reports_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            buffer,
            media_type='application/pdf',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

# API to delete an event report by ID
@event_reports_api_router.delete('/api/event-reports/{report_id}', status_code=204)
def delete_event_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    report = db.query(models.EventReports).filter(models.EventReports.event_id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

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