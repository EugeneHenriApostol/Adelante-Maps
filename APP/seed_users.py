from sqlalchemy.orm import Session
from database import SessionLocal
import models
import security
import random


def generate_unique_emails(count: int, db: Session) -> list:
    emails = set()
    while len(emails) < count:
        random_number = random.randint(100, 999)  # 3-digit random number
        email = f"user{random_number}@example.com"

        # Check if the email already exists in the database
        existing_user = db.query(models.User).filter(models.User.email == email).first()
        if not existing_user:
            emails.add(email)  # Ensure uniqueness

    return list(emails)


def seed_users():
    db: Session = SessionLocal()
    
    try:
        # Generate unique emails that are not in the database
        unique_emails = generate_unique_emails(14, db)

        # Define user data
        users_data = [
            {
                "email": unique_emails[i],
                "first_name": f"User{i}",
                "last_name": "Test",
                "is_verified": i < 10,  # First 10 are verified, last 4 are not
                "role_id": 1
            }
            for i in range(len(unique_emails))  # Use actual generated count
        ]

        # Hash password
        hashed_password = security.get_password_hash("1234")

        # Create and insert users only if they do not exist
        for user_data in users_data:
            existing_user = db.query(models.User).filter(models.User.email == user_data["email"]).first()
            if not existing_user:
                new_user = models.User(
                    email=user_data["email"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    is_verified=user_data["is_verified"],
                    role_id=user_data["role_id"],
                    hashed_password=hashed_password
                )
                db.add(new_user)

        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
