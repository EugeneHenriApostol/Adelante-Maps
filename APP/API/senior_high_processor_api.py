# senior_high_processor_api.py
import io
import math
import os
import re
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv
from fastapi import File, HTTPException, UploadFile, requests
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd

from fastapi import APIRouter, Depends
from sklearn.cluster import KMeans
import requests
from sklearn.metrics import silhouette_score
import auth, models

senior_high_file_api_router = APIRouter()

load_dotenv()

def clean_text(text):
    return re.sub(r'[^\w\s]', '', str(text))

# remove column function
def remove_column(file_path: str, column_name: str):

    try:
        df = pd.read_csv(file_path)

        if column_name in df.columns:
            df.drop(columns=[column_name], inplace=True)
        else:
            raise HTTPException(status_code=400, detail=f'Column {column_name} not found.')

        # save the processed file
        output_path = file_path.replace(".csv", "_updated.csv")
        df.to_csv(output_path, index=False)
        return output_path


    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Error processing file: {e}')
    
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
        else:
            print(f"Geocoding failed for {address}, returning 'Unknown'")
            return "Unknown", "Unknown"
    else:
        print(f"Error geocoding {address}: {response.status_code}")
        return "Unknown", "Unknown"


def geocode_previous_school(school: str):
    if not school or school.strip().lower() == "na":
        return "Unknown", "Unknown"

    clean_school = clean_text(school)
    
    query_address = f"{clean_school}, Philippines"
    
    api_key_prev = os.getenv("GEOCODE_API_KEY") 
    if not api_key_prev:
        raise HTTPException(status_code=500, detail="Geocode API key for previous schools is missing.")
    
    url = "https://geocode.search.hereapi.com/v1/geocode"
    params = {"q": query_address, "apiKey": api_key_prev}
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        if data['items']:
            lat = data['items'][0]['position']['lat']
            lng = data['items'][0]['position']['lng']
            return lat, lng
    return "Unknown", "Unknown"
    
# preprocess senior high file function
def preprocess_file_seniorhigh(file_path: str):
    # read csv file
    try:
        df = pd.read_csv(file_path, header=None)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {e}")
    
    api_key = os.getenv("GEOCODE_API_KEY")  # replace api key (free but expires after 1000 uses)
    if not api_key:
        raise HTTPException(status_code=500, detail="Geocode API key is missing.")
    
    # preprocessing part
    expected_columns = [
        'year', 'strand', 'age', 'strand_abbrev', 'previous_school',
        'city', 'province', 'barangay'
    ]
    
    df.columns = expected_columns

    df.insert(0, 'stud_id', range(1, len(df) + 1))

    df["year"] = df["year"].fillna("N/A").astype(str).str.strip()
    df["age"] = pd.to_numeric(df["age"], errors="coerce").fillna(0)
    df["strand"] = df["strand"].fillna("N/A").astype(str).str.strip()
    df["previous_school"] = df["previous_school"].fillna("Unknown").str.strip()
    df["city"] = df["city"].fillna("Unknown").str.strip()
    df["province"] = df["province"].fillna("Unknown").str.strip()
    df["barangay"] = df["barangay"].fillna("Unknown").str.strip()

    df["barangay"] = df["barangay"].str.strip().str.title()
    df["city"] = df["city"].str.strip().str.title()
    df["province"] = df["province"].str.strip().str.title()

    df["full_address"] = (
        df["barangay"] + ", " + df["city"] + ", " + df["province"]
    ).str.strip()

    if 'strand_abbrev' in df.columns:
        df.drop(columns=['strand_abbrev'], inplace=True)

    # geocode part
    def get_coordinates(address):
            return geocode_address(address, api_key)
        
    geocoded_data = df['full_address'].apply(get_coordinates)
    df['latitude'], df['longitude'] = zip(*geocoded_data)

    # cluster part
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce').fillna(0)
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce').fillna(0)

    valid_coordinates = df[(df['latitude'] != 0) & (df['longitude'] != 0)].copy()  

    unique_lat_long = valid_coordinates[['latitude', 'longitude']].drop_duplicates()
    n_clusters = unique_lat_long.shape[0]

    if n_clusters > 0:
        kmeans_address = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto', init='k-means++')
        valid_coordinates['cluster_address'] = kmeans_address.fit_predict(valid_coordinates[['latitude', 'longitude']].values)

        # merge back to main data frame
        df = df.merge(
            valid_coordinates[['stud_id', 'cluster_address']],
            on='stud_id',
            how='left'
        )
    else: 
        df['cluster_address'] = -1
    
    df['cluster_address'] = df['cluster_address'].fillna(-1).astype(int)
    
    df_cebu = df[
        ((df['province'].str.contains('Cebu', na=False, case=False)) |
        (df['full_address'].str.contains('Cebu', na=False, case=False))) &
        (df['latitude'] != 0) & (df['longitude'] != 0)
    ].copy()

    if not df_cebu.empty:
        n = len(df_cebu)
        upper_k = round(math.sqrt(n / 2))
        print(f"Sample size (Cebu-based students): {n}")
        print(f"Upper limit for k (√(n/2)): {upper_k}")

        best_k = 2
        best_score = -1
        coords = df_cebu[['latitude', 'longitude']].values

        for k in range(2, max(3, upper_k + 1)):
            kmeans = KMeans(n_clusters=k, random_state=42, init='k-means++')
            labels = kmeans.fit_predict(coords)
            score = silhouette_score(coords, labels)
            if score > best_score:
                best_score = score
                best_k = k
        print(f"Optimal k based on Silhouette Score: {best_k}")
        print(f"Best Silhouette Score: {best_score:.4f}")
    else:
        best_k = 1

    kmeans_proximity = KMeans(n_clusters=best_k, random_state=42, init='k-means++')
    df_cebu['cluster_proximity'] = kmeans_proximity.fit_predict(coords)

    df = df.merge(
        df_cebu[['stud_id', 'cluster_proximity']],
        on='stud_id',
        how='left'
    )
    df['cluster_proximity'] = df['cluster_proximity'].fillna(-1).astype(int)


    # geocode previous school part
    geocoded_prev_school = df['previous_school'].apply(geocode_previous_school)
    df['prev_latitude'], df['prev_longitude'] = zip(*geocoded_prev_school)

    df['prev_latitude'] = df['prev_latitude'].fillna("Unknown")
    df['prev_longitude'] = df['prev_longitude'].fillna("Unknown")
    
    # save the cleaned file
    output_path = file_path.replace(".csv", "_processed.csv")
    df.to_csv(output_path, index=False)
    return output_path

# upload raw senior high student file api
@senior_high_file_api_router.post('/api/upload/raw/seniorhigh-file')
async def upload_file(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_admin)):
    # check if file is csv
    if not file.filename.endswith('csv'):
        raise HTTPException(status_code=400, detail='Only CSV files are allowed.')

    try:
        with NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        processed_path = preprocess_file_seniorhigh(tmp_path)

    finally:
        os.remove(tmp_path)  # clean up uploaded file

    # return file as a response without saving to the server
    return FileResponse(
        path=processed_path,
        media_type='text/csv',
        filename="preprocessed_seniorhigh_file.csv"
    )  