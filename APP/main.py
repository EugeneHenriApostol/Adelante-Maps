#main.py

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from API.register_api import register_api_router
from API.login_api import login_api_router
from API.get_users_api import get_users_api_router
from API.edit_users import edit_users_api_router
from API.delete_users import delete_users_api_router
from API.current_user_api import user_info_api_router
from API.senior_high_processor_api import senior_high_file_api_router
from API.college_file_processor_api import college_file_api_router
from API.upload_db_api import upload_db_api_router
from API.get_students_api import get_students_api_router
from API.reset_password_api import reset_password_api_router
from API.event_report_api import event_reports_api_router
from API.chatbot_api import chatbot_api_router
from API.route_evaluation import route_evaluation_router
from API.usjr_student_processor_api import usjr_student_processor_api_router

from Routes.register_route import register_router
from Routes.login_route import login_router
from Routes.admin_dashboard_route import admin_dashboard_router
from Routes.maps_route import maps_router
from Routes.manage_files_route import manage_files_router
from Routes.college_file_processor_route import college_file_processor_router
from Routes.upload_db_route import upload_db_router
from Routes.index_route import index_router
from Routes.college_student_route import college_student_router
from Routes.seniorhigh_student_route import seniorhigh_student_router
from Routes.forgot_password_route import forgot_password_router
from Routes.reset_password_link_route import reset_password_link_router
from Routes.seniorhigh_data_analytics_route import seniorhigh_analytics_router
from Routes.college_data_analytics_route import college_analytics_router
from Routes.event_reports_route import event_reports_router
from Routes.file_process_route import file_process_router


app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(register_api_router)
app.include_router(login_api_router)

app.include_router(register_router)
app.include_router(login_router)
app.include_router(admin_dashboard_router)
app.include_router(maps_router)
app.include_router(manage_files_router)
app.include_router(college_file_processor_router)
app.include_router(file_process_router)
app.include_router(upload_db_router)
app.include_router(index_router)
app.include_router(college_student_router)
app.include_router(seniorhigh_student_router)
app.include_router(forgot_password_router)
app.include_router(reset_password_link_router)
app.include_router(seniorhigh_analytics_router)
app.include_router(college_analytics_router)
app.include_router(event_reports_router)
app.include_router(file_process_router)

app.include_router(get_users_api_router)
app.include_router(edit_users_api_router)
app.include_router(delete_users_api_router)
app.include_router(user_info_api_router)
app.include_router(upload_db_api_router)
app.include_router(get_students_api_router)
app.include_router(reset_password_api_router)
app.include_router(event_reports_api_router)
app.include_router(usjr_student_processor_api_router)

app.include_router(senior_high_file_api_router)
app.include_router(college_file_api_router)

app.include_router(chatbot_api_router)
app.include_router(route_evaluation_router)

if __name__ == "__main__":
    uvicorn.run(app=app, host="localhost", port=8000)