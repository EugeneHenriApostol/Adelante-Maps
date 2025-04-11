from datetime import datetime, timezone
from sqlalchemy import JSON, Boolean, Column, Float, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(50), unique=True, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    hashed_password = Column(String(255)) # store a hashed version of the password instead of plain text so if our db gets compromised the attackers cant get or do anything
    is_verified = Column(Boolean, default=False)
    role_id = Column(Integer, ForeignKey("roles.role_id"), default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    role = relationship("Role")

class Role(Base):
    __tablename__ = "roles"
    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)

class PreviousSchool(Base):
    __tablename__ = 'previous_schools'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    latitude = Column(Float)
    longitude = Column(Float)

    students = relationship('SeniorHighStudents', back_populates='previous_school')

class SeniorHighStudents(Base):
    __tablename__ = 'senior_high_students'
    stud_id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    strand = Column(String(50))
    age = Column(Integer)
    city = Column(String(100))
    province = Column(String(100))
    barangay = Column(String(255))
    full_address = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    cluster_address = Column(Integer)
    cluster_proximity = Column(Integer)

    previous_school_id = Column(Integer, ForeignKey('previous_schools.id'))
    previous_school = relationship('PreviousSchool', back_populates='students')

class CollegeStudents(Base):
    __tablename__ = "college_students"
    stud_id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    course = Column(String(50))
    age = Column(Integer)
    strand = Column(String(50))
    previous_school = Column(String(255))
    city = Column(String(100))
    province = Column(String(255))
    barangay = Column(String(255))
    full_address = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    cluster_address = Column(Integer)
    cluster_proximity = Column(Integer)

class EventReports(Base):
    __tablename__ = "event_reports"
    event_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    total_area = Column(Float, nullable=False)
    number_of_students_affected = Column(Integer, nullable=False)
    geojson_data = Column(JSON, nullable=False)
    clustering_type = Column(String(100))  
    education_level = Column(String(100))  
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")