from io import StringIO
import io
import os
import re
from tempfile import NamedTemporaryFile
from fastapi import File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
import pandas as pd

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import models, auth
from database import get_db

upload_senior_high_file_api_router = APIRouter()

# preprocess senior high file function
def preprocess_file_seniorhigh(file_path: str) -> io.BytesIO:
    # read csv file
    try:
        df = pd.read_csv(file_path, header=None)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {e}")
    
    # define expected columns
    expected_columns = [
        'year', 'strand', 'age', 'strand_abbrev', 'previous_school',
        'city', 'province', 'barangay'
    ]

    # check column count
    if df.shape[1] != len(expected_columns):
        raise HTTPException(status_code=400, detail=f"Column count mismatch: expected {len(expected_columns)}, got {df.shape[1]}")
    
    # assign columns
    df.columns = expected_columns
    df.insert(0, 'stud_id', range(1, len(df) + 1))

    # fill missing values and preprocess
    df['year'] = df['year'].fillna('N/A').astype(str).str.strip()
    df['age'] = pd.to_numeric(df['age'], errors='coerce').fillna(0)
    df['full_address'] = (
        df['barangay'].fillna('Unknown') + ', ' +
        df['city'].fillna('Unknown') + ', ' + 
        df['province'].fillna('Unknown')
    ).str.strip()

    # save the cleaned data in an in-memory file
    output = io.BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return output

# remove column function
def remove_column(file_content: io.BytesIO, column_name: str) -> io.BytesIO:
    try:
        df = pd.read_csv(file_content)

        if column_name in df.columns:
            df.drop(columns=[column_name], inplace=True)
        else:
            raise HTTPException(status_code=400, detail=f'Column {column_name} not found.')

        output = io.BytesIO
        df.to_csv(output, index=False)    
        output.seek(0)
        return output

    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Error processfile file {e}')     
    
# upload raw senior high student file api
@upload_senior_high_file_api_router.post('/api/upload-seniorhigh-file')
async def upload_file(file: UploadFile = File(...)):
    # check if file is csv
    if not file.filename.endswith('csv'):
        raise HTTPException(status_code=400, detail='Only CSV files are allowed.')
    
    try: 
        # saved the uploaded file temporarily
        with NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # process the file and get the in-memory stream
        processed_file = preprocess_file_seniorhigh(tmp_path)
    finally:
        os.remove(tmp_path) # always delete temporary file after processing

    # return file as a response without saving to the server
    return StreamingResponse(
        processed_file, 
        media_type='text/csv', 
        headers={'Content-Disposition': 'attachment; filename=cleaned_seniorhigh_file.csv'}
        )

# api to remove column
@upload_senior_high_file_api_router.post('/api/remove-column')
async def remove_strand_abbrev(file: UploadFile = File(...)):
    # check if file is csv
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail='Only CSV files are allowed.')
    
    try:
        file_content = io.BytesIO(await file.read())
        processed_file = remove_column(file_content, 'strand_abbrev')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return StreamingResponse(
        processed_file,
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=updated_seniorhigh_file.csv'}
    )

def clean_text(text):
    return re.sub(r'[^\w\s]', '', str(text))

# function to geocode address using HERE API