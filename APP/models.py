from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Float, Integer, String, ForeignKey, DateTime
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

class SeniorHighStudents(Base):
    __tablename__ = 'senior_high_students'
    stud_id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    strand = Column(String(50))
    age = Column(Integer)
    previous_school = Column(String(255))
    city = Column(String(100))
    province = Column(String(100))
    barangay = Column(String(255))
    full_address = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    cluster_address = Column(Integer)
    cluster_proximity = Column(Integer)

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