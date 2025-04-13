from fastapi import APIRouter, UploadFile, File
from fastapi.responses import FileResponse
import pandas as pd
import io, os

usjr_student_processor_api_router = APIRouter()

senior_high_strands = [
    "A.B.M.-Acctcy", "A.B.M.-Mktg/Mgt", "TVL-Food Mgt.", "TVL-H.T.M.", "TVL-I.C.T.",
    "Hum.S.S", "S.T.E.M.-SciMed", "S.T.E.M.-Engg", "S.T.E.M.-Tech"
]

@usjr_student_processor_api_router.post('/upload-file/')
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    data = io.StringIO(content.decode('utf-8', errors='replace'))

    df = pd.read_csv(data, header=None)

    senior_high_df = df[df[1].isin(senior_high_strands)]
    college_df = df[~df[1].isin(senior_high_strands)]

    senior_high_file_path = os.path.join("senior_high.csv")
    college_file_path = os.path.join("college.csv")

    senior_high_df.to_csv(senior_high_file_path, header=False, index=False)
    college_df.to_csv(college_file_path, header=False, index=False)

    return {
        'senior_high': f'/download/{os.path.basename(senior_high_file_path)}',
        'college': f'/download/{os.path.basename(college_file_path)}'
    }

@usjr_student_processor_api_router.get('/download/{file_name}')
async def download_file(file_name: str):
    file_path = os.path.join(file_name)
    return FileResponse(file_path, media_type='text/csv')