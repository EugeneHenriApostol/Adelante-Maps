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
    hashed_password = Column(String(255))
    is_verified = Column(Boolean, default=False)
    role_id = Column(Integer, ForeignKey("roles.role_id"), default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    role = relationship("Role")
    activities = relationship("UserActivityLog", back_populates="user")
    
class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"
    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    activity_type = Column(String(50), nullable=False)
    target_table = Column(String(100), nullable=False)
    file_name = Column(String(255))
    record_count = Column(Integer)
    file_size = Column(Float)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="activities")

class Role(Base):
    __tablename__ = "roles"
    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)

class Campus(Base):
    __tablename__ = "campuses"
    campus_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    strands = relationship('Strand', back_populates='campus')
    courses = relationship('Course', back_populates='campus')

class Strand(Base):
    __tablename__ = 'strands'
    strand_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    campus_id = Column(Integer, ForeignKey('campuses.campus_id'))

    campus = relationship('Campus', back_populates='strands')

class Course(Base):
    __tablename__ = 'courses'
    course_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    campus_id = Column(Integer, ForeignKey('campuses.campus_id'))

    campus = relationship('Campus', back_populates='courses')


class PreviousSchool(Base):
    __tablename__ = 'previous_schools'
    previousSchool_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    latitude = Column(Float)
    longitude = Column(Float)

    students_senior_high = relationship('SeniorHighStudents', back_populates='previous_school')
    students_college = relationship('CollegeStudents', back_populates='previous_school')
 
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
    cluster = Column(Integer)

    previous_school_id = Column(Integer, ForeignKey('previous_schools.previousSchool_id'))
    previous_school = relationship('PreviousSchool', back_populates='students_senior_high')
    
    strand_id = Column(Integer, ForeignKey('strands.strand_id'))
    strand_relationship = relationship('Strand')

class CollegeStudents(Base):
    __tablename__ = "college_students"
    stud_id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer)
    course = Column(String(50))
    age = Column(Integer)
    strand = Column(String(50))
    city = Column(String(100))
    province = Column(String(255))
    barangay = Column(String(255))
    full_address = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    cluster = Column(Integer)

    previous_school_id = Column(Integer, ForeignKey('previous_schools.previousSchool_id'))
    previous_school = relationship('PreviousSchool', back_populates='students_college')
    
    course_id = Column(Integer, ForeignKey('courses.course_id'))
    course_relationship = relationship('Course') 


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