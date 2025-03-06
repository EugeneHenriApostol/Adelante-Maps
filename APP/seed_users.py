from sqlalchemy.orm import Session
from database import SessionLocal
import models
import security
import random


def generate_unique_emails(count: int) -> list:
    emails = set()
    while len(emails) < count:
        random_number = random.randint(100, 999)  # 3-digit random number
        email = f"user{random_number}@example.com"
        emails.add(email)  # Ensure uniqueness
    return list(emails)


def seed_users():
    db: Session = SessionLocal()
    
    try:
        # Generate unique emails for 10 verified and 4 unverified users
        unique_emails = generate_unique_emails(14)
        
        # Define user data
        users_data = [
            {
                "email": unique_emails[i],
                "first_name": f"User{i}",
                "last_name": "Test",
                "is_verified": i < 10,  # First 10 are verified, last 4 are not
                "role_id": 1
            }
            for i in range(14)
        ]

        # Hash password
        hashed_password = security.get_password_hash("1234")

        # Create user objects
        users = [
            models.User(
                email=user["email"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                is_verified=user["is_verified"],
                role_id=user["role_id"],
                hashed_password=hashed_password
            )
            for user in users_data
        ]

        # Add and commit to the database
        db.add_all(users)
        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_users()