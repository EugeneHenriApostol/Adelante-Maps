import io
import os
import re
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv
from fastapi import File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
import pandas as pd

import models, auth

from fastapi import APIRouter, Depends
from sklearn.cluster import KMeans
import requests

college_file_api_router = APIRouter()

load_dotenv()

def clean_text(text):
    return re.sub(r'[^\w\s]', '', str(text))

# preprocess college file function
def preprocess_file_college(file_path: str) -> io.BytesIO:
    try:
        # read the raw CSV file
        df = pd.read_csv(file_path, header=None)  
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {e}")

    # define the expected column names 
    expected_columns = [
        "year", "course", "age", "strand", 
        "previous_school", "city", "province", "barangay"
    ]

    # Check if the uploaded file matches the expected structure
    if df.shape[1] != len(expected_columns):
        raise HTTPException(
            status_code=400,
            detail=f"Column count mismatch: expected {len(expected_columns)}, got {df.shape[1]}"
        )

    # Assign column names to match the uploaded CSV
    df.columns = expected_columns

    # Add incremental student ID
    df.insert(0, "stud_id", range(1, len(df) + 1))

    # Fill missing values
    df["year"] = df["year"].fillna("N/A").astype(str).str.strip()
    df["course"] = df["course"].fillna("N/A").astype(str).str.strip()
    df["age"] = pd.to_numeric(df["age"], errors="coerce").fillna(0)
    df["strand"] = df["strand"].fillna("N/A").astype(str).str.strip()
    df["previous_school"] = df["previous_school"].fillna("Unknown").str.strip()
    df["city"] = df["city"].fillna("Unknown").str.strip()
    df["province"] = df["province"].fillna("Unknown").str.strip()
    df["barangay"] = df["barangay"].fillna("Unknown").str.strip()

    # Clean the 'strand' column by removing leading digits
    df["strand"] = df["strand"].apply(lambda x: re.sub(r"^\d{2}", "", x).strip())

    # Create the full address column by concatenating city, province, and barangay
    df["full_address"] = (
        df["barangay"] + ", " + df["city"] + ", " + df["province"]
    ).str.strip()

    # Save the cleaned file
    output = io.BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return output


# upload raw college file api
@college_file_api_router.post("/api/upload/raw/college-file")
async def upload_file(file: UploadFile = File(...)):
    # Validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    # Save the uploaded file to a temporary location
    try:
        with NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

            processed_file = preprocess_file_college(tmp_path)

    finally:
        os.remove(tmp_path)  # delete temp file after preprocessing

    # return the processed file as a response without saving to the server
    return StreamingResponse(
        processed_file,
        media_type='text/csv',
        headers={"Content-Disposition": "attachment; filename=[1]_preprocessed_college_file.csv"}
    )

# function to geocode address using HERE API
def geocode_address(address, api_key):
    url = "https://geocode.search.hereapi.com/v1/geocode"
    params = {"q": address, "apiKey": api_key}
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        if data['items']:
            latitude = data['items'][0]['position']['lat']
            longitude = data['items'][0]['position']['lng']
            return latitude, longitude
    return None, None

# geocode college student address api
@college_file_api_router.post('/api/geocode/college-file')
async def geocode_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    api_key = "eY_QRv4JiuZ6uNkLicgxHwkS9gCuygfWNkZLKK6meN4"  # replace api key (free but expires after 1000 uses)

    try:
        file_content = io.BytesIO(await file.read())
        df = pd.read_csv(file_content, na_values=[""], keep_default_na=False)
        df.fillna("NA", inplace=True)

        # clean specified columns
        columns_to_clean = ['previous_school', 'city', 'province', 'barangay']
        for col in columns_to_clean:
            if col in df.columns:
                df[col] = df[col].apply(clean_text)

        # combine address (full address)
        if all(col in df.columns for col in ['barangay', 'city', 'province']):
            df['full_address'] = df['barangay'] + ', ' + df['city'] + ', ' + df['province']
        else:
            raise HTTPException(status_code=400, detail="Missing required columns needed for geocoding")
        
        # geocode address
        geocoded_data = df['full_address'].apply(lambda x: geocode_address(x, api_key))
        df['latitude'], df['longitude'] = zip(*geocoded_data)

        output = io.BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type='text/csv',
            headers={"Content-Disposition": "attachment; filename=[2]_geocoded_college_file.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {e}")

# college cluster
@college_file_api_router.post('/api/cluster/college-file') 
async def cluster_file(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_admin)):
    # check if file is csv
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail='Only CSV files are allowed.')
    
    api_key = os.getenv('HERE_GEOCODE_API_KEY')

    try:
        file_content = io.BytesIO(await file.read())
        df = pd.read_csv(file_content, index_col=False)

        # remove unnamed columns if any exist
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

        # check if latitude and longitude columns exist
        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            raise HTTPException(status_code=400, detail='File must contain latitude and longitude columns.')
        
        # remove rows with missing or unknown latitude and longitude columns
        df = df[df['latitude'] != 'Unknown']
        df = df[df['longitude'] != 'Unknown']

        # convert latitude and longitude to numbers
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')

        # drop rows with NaN values
        df.dropna(subset=['latitude', 'longitude'], inplace=True)

        if df.empty:
            raise HTTPException(status_code=400, detail='No valid data after removing missing values.')
        
        # cluster address in unique lat-long pairs
        unique_lat_long = df[['latitude', 'longitude']].drop_duplicates()
        n_clusters = unique_lat_long.shape[0]

        X = df[['latitude', 'longitude']].values
        kmeans_address = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
        df['cluster_address'] = kmeans_address.fit_predict(X)

        # cluster proximity, keep students who are only in Cebu. 6 is the optimal k
        df_cebu = df[
            df['province'].str.contains('Cebu', na=False, case=False) |
            df['full_address'].str.contains('Cebu', na=False, case=False)
        ].copy()

        if not df_cebu.empty:
            k = 6  # optimal K
            kmeans_proximity = KMeans(n_clusters=k, random_state=42, n_init='auto')
            df_cebu['cluster_proximity'] = kmeans_proximity.fit_predict(df_cebu[['latitude', 'longitude']].values)

            # Merge with all latitude-longitude pairs
            df = df.merge(df_cebu[['latitude', 'longitude', 'cluster_proximity']], on=['latitude', 'longitude'], how='left')

            # Ensure unique student IDs by keeping the first occurrence
            df = df.groupby('stud_id', as_index=False).first()
        else:
            df['cluster_proximity'] = -1  # assign -1 for students outside Cebu

        # ensure no NaN values
        df['cluster_proximity'] = df['cluster_proximity'].fillna(-1).astype(int)

        # Debugging: Print cluster counts
        print(df[['cluster_address', 'cluster_proximity']].value_counts())

        # ensure no unnamed first column
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

        # convert data frame back to csv
        output = io.BytesIO()
        df.to_csv(output, index=False)  # Ensure no index is written
        output.seek(0)

        return StreamingResponse(
            output, 
            media_type='text/csv',
            headers={'Content-Disposition': 'attachment; filename=[ready_to_upload]_clustered_college_file.csv'}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
