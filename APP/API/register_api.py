# register.py

from email.message import EmailMessage
import smtplib
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError

import auth, models, schemas, security
from database import get_db

from fastapi import BackgroundTasks
from apscheduler.schedulers.background import BackgroundScheduler

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import utils

from database import SessionLocal
from datetime import datetime, timedelta, timezone

import os
from dotenv import load_dotenv


register_api_router = APIRouter()

# load env variables
load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_verification_email(background_tasks: BackgroundTasks, email: str, token: str):
    verification_link = f"http://localhost:8000/api/verify-email?token={token}"
    subject = "Verify Your Email"

    # create a multipart email (HTML + plain text fallback)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USERNAME
    msg["To"] = email

    # plain text version (for email clients that don’t support HTML)
    text_body = f"Click the link to verify your email: {verification_link}"

    # HTML version (for better styling)
    html_body = f"""
    <html>
    <head>
        <style>
            .container {{
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 10px;
                text-align: center;
                background-color: #f9f9f9;
            }}
            .button {{
                display: inline-block;
                background-color: #007bff;
                color: white;
                padding: 10px 20px;
                margin-top: 20px;
                text-decoration: none;
                font-size: 16px;
                border-radius: 5px;
            }}
            .footer {{
                font-size: 12px;
                color: #666;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Verify Your Email</h2>
            <p>Click the button below to verify your email address:</p>
            <a href="{verification_link}" class="button">Verify Email</a>
            <p class="footer">If you did not request this, you can ignore this email.</p>
        </div>
    </body>
    </html>
    """

    # attach both plain text and HTML versions
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    # send email in the background
    def send_email():
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

    background_tasks.add_task(send_email)

# intialize scheduler
scheduler = BackgroundScheduler()

# function to delete unverified users within 10 min
def delete_unverified_users():
    db = SessionLocal()
    try:
        expiration_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        print(f"Running clean up at {datetime.now(timezone.utc)}")

        unverified_users = db.query(models.User).filter(
            models.User.is_verified == False, models.User.created_at < expiration_time
        ).all()

        print(f"Found {len(unverified_users)} unverified users to delete.")
        for user in unverified_users:
            print(f"Deleting: {user.email}, Created At: {user.created_at}")

            db.delete(user)
        db.commit()
        print("Deleted unverified users successfully.")
    finally:
        db.close()


# register api endpoint
@register_api_router.post("/api/register", response_model=schemas.UserInDBBase)
def register(user_in: schemas.UserIn, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):

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

    token = utils.create_verification_token(db_user.email)
    send_verification_email(background_tasks, db_user.email, token)

    return db_user

# auto database cleaner for unverified users after 30 min
scheduler.add_job(delete_unverified_users, "interval", minutes=5)
scheduler.start()

# verify email endpoint
@register_api_router.get("/api/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid token")

        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.is_verified = True
        db.commit()

        return {"message": "Email verified successfully"}
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")


# check email endpoint to check if email already exists in the database
@register_api_router.get("/api/check-email")
def check_email(email: str, db: Session = Depends(get_db)):
    db_user = auth.get_user(db, email=email)
    return {"exists": db_user is not None}