from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = "mysql+pymysql://root:daggergaming1@localhost/adelante_maps"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# creates a base class needed for creating database ORM models, used as dependency injection in the API
# this base class is used to define database models. all models should inherit from this
Base = declarative_base()
    
# dependency function to provide a database session
def get_db():
    db = SessionLocal() # create an instance of a session / new session when we make a connection to the database
    try:
        yield db # pass or provide session to an api endpoint
    finally:
        db.close() # close the session when done even if an error occurs