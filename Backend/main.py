#main.py

from fastapi import FastAPI
import uvicorn
from api import api_handler
from routes import router


app = FastAPI()

app.include_router(api_handler)
app.include_router(router)

if __name__ == "__main__":
    uvicorn.run(app=app, host="localhost", port=8000)