from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import auth, models, schemas, security
from database import get_db

from fastapi import BackgroundTasks
from apscheduler.schedulers.background import BackgroundScheduler

from email.message import EmailMessage
import smtplib

from database import SessionLocal
from datetime import datetime, timedelta, timezone

api_handler = APIRouter()

# smtp setup
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "eugenehenriapostol@gmail.com"  
SMTP_PASSWORD = "tnra zrdt pfrz opqu"

# function to send verification email
def send_verification_email(background_tasks: BackgroundTasks, email: str, token: str):
    verification_link = f"http://localhost:8000/api/verify-email?token={token}"
    subject = "Verify your email"
    body = f"Click the link to verify your email: {verification_link}"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_USERNAME
    msg["To"] = email
    msg.set_content(body)

    # function to send email
    def send_email():
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

    background_tasks.add_task(send_email)

# intialize scheduler
scheduler = BackgroundScheduler()

# function to delete unverified users within 45 min
def delete_unverified_users():
    db = SessionLocal()
    try:
        expiration_time = datetime.now(timezone.utc) - timedelta(minutes=45)
        print(f"Running clean up at {datetime.now(timezone.utc)}")
        unverified_users = db.query(models.User).filter(models.User.is_verified == False, models.User.created_at < expiration_time).all()

        if unverified_users:
            for user in unverified_users:
                print(f"Deleting unverified user: {user.email}")
                db.delete(user)
            db.commit()
    finally:
        db.close()

# register api endpoint
@api_handler.post("/api/register", response_model=schemas.UserInDBBase)
def register(user_in: schemas.UserIn, db: Session = Depends(get_db)):

    # check if user already exists
    db_user = auth.get_user(db, email=user_in.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # hash password
    hashed_password = security.get_password_hash(user_in.password)

    # create new user instance
    db_user = models.User(
        **user_in.model_dump(exclude={"password"}), hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
