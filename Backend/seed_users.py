from sqlalchemy.orm import Session
from database import SessionLocal
import models
import security

def seed_users():
    db: Session = SessionLocal()  # FIXED: Call SessionLocal() to get a session instance

    try:
        # Define user data (7 verified, 7 unverified)
        users_data = [
            {
                "email": f"user{i}@example.com",
                "first_name": f"User{i}",
                "last_name": "Test",
                "is_verified": i < 7,  # First 7 are verified, last 7 are not
                "role_id": 1
            }
            for i in range(14)
        ]

        # Hash password once for efficiency
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
