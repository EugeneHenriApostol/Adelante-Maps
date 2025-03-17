# reset_password_api.py
from email.message import EmailMessage
import smtplib
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth, schemas, security
from database import get_db

import utils

import os
from dotenv import load_dotenv

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

reset_password_api_router = APIRouter()

# load env variables
load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# send reset email
def send_reset_password_email(email: str, token: str):
    try:
        reset_link = f"http://localhost:8000/reset-password-link?token={token}"
        subject = "Reset Your Password"

        # Create a multipart email (HTML + plain text fallback)
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USERNAME
        msg["To"] = email

        # Plain text version (for email clients that don’t support HTML)
        text_body = f"Click the link to reset your password: {reset_link}"

        # HTML version (with styling)
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
                    background-color: #d9534f;
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
                <h2>Reset Your Password</h2>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <p class="footer">If you did not request this, you can ignore this email.</p>
            </div>
        </body>
        </html>
        """

        # Attach both plain text and HTML versions
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@reset_password_api_router.post('/api/request-password-reset')
def request_password_reset(request: Dict, db: Session = Depends(get_db)):
    email = request.get('email')
    if not email:
        raise HTTPException(status_code=400, detail='Email is required')
    
    user = auth.get_user(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    
    token = utils.generate_reset_password_token(email)

    send_reset_password_email(email, token)

    return {"message": "Password reset email sent"}

@reset_password_api_router.post("/api/reset-password")
async def reset_password(data: schemas.ResetPassword, db: Session = Depends(get_db)):
    email = security.verify_reset_password_token(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = auth.get_user(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Hash and update the new password
    hashed_password = security.get_password_hash(data.new_password)
    user.hashed_password = hashed_password
    db.flush() 
    db.commit()

    return {"message": "Password successfully reset"}