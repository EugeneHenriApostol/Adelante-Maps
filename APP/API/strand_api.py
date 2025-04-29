from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
import models, schemas, auth

strand_api_router = APIRouter()

@strand_api_router.post('/api/strands', response_model=schemas.Strand)
def create_strand(strand_data: schemas.StrandBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    existing = db.query(models.Strand).filter_by(name=strand_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Strand already exists")
    
    campus = db.query(models.Campus).filter_by(campus_id=strand_data.campus_id).first()
    if not campus:
        raise HTTPException(status_code=400, detail="Campus does not exist")

    strand = models.Strand(
        name=strand_data.name,
        campus_id=strand_data.campus_id
    )
    db.add(strand)
    db.commit()
    db.refresh(strand)
    return strand

@strand_api_router.get('/api/retrieve/strands', response_model=List[schemas.StrandWithCampus])
def get_strands(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    return db.query(models.Strand).options(joinedload(models.Strand.campus)).all()

@strand_api_router.put('/api/strands/{strand_id}', response_model=schemas.Strand)
def update_strand(strand_id: int, updated_data: schemas.StrandBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    strand = db.query(models.Strand).filter_by(strand_id=strand_id).first()
    if not strand:
        raise HTTPException(status_code=404, detail="Strand not found")

    strand.name = updated_data.name
    strand.campus_id = updated_data.campus_id
    db.commit()
    db.refresh(strand)
    return strand

@strand_api_router.delete('/api/strands/{strand_id}')
def delete_strand(strand_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    strand = db.query(models.Strand).filter_by(strand_id=strand_id).first()
    if not strand:
        raise HTTPException(status_code=404, detail="Strand not found")
    db.delete(strand)
    db.commit()
    return {"message": "Strand deleted successfully"}