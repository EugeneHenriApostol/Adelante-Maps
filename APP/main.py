#main.py

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn

from API.register_api import register_api_router
from API.login_api import login_api_router
from API.get_users_api import get_users_api_router

from Routes.register_route import register_router
from Routes.login_route import login_router
from Routes.admin_dashboard_route import admin_dashboard_router
from Routes.maps_route import maps_router


app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(register_api_router)
app.include_router(login_api_router)

app.include_router(register_router)
app.include_router(login_router)
app.include_router(admin_dashboard_router)
app.include_router(maps_router)

app.include_router(get_users_api_router)

if __name__ == "__main__":
    uvicorn.run(app=app, host="localhost", port=8000)