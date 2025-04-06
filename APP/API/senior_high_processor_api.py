# senior_high_processor_api.py
import io
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
import auth, models

senior_high_file_api_router = APIRouter()

load_dotenv()

# preprocess senior high file function
def preprocess_file_seniorhigh(file_path: str) -> str:
    # read csv file
    try:
        df = pd.read_csv(file_path, header=None)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {e}")
    
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

    df["full_address"] = (
        df["barangay"] + ", " + df["city"] + ", " + df["province"]
    ).str.strip()

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
        filename="[1]_preprocessed_seniorhigh_file.csv"
    )

# remove column function
def remove_column(file_path: str, column_name: str) -> str:

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
        raise HTTPException(status_code=400, detail=f'Error processfile file {e}')     
    
# api endpoint to remove column
@senior_high_file_api_router.post('/api/remove-column')
async def remove_strand_abbrev(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_admin)):
    # check if file is csv
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail='Only CSV files are allowed.')
    
    try:
        with NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

            processed_path = remove_column(tmp_path, 'strand_abbrev')
    
    finally:
        os.remove(tmp_path)
    
    return FileResponse(
        path=processed_path,
        media_type='text/csv',
        filename="[2]_updated_seniorhigh_file.csv"
    )

def clean_text(text):
    return re.sub(r'[^\w\s]', '', str(text))    

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

# geocode senior high student address api
@senior_high_file_api_router.post('/api/geocode/seniorhigh-file')
async def geocode_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    api_key = os.getenv("GEOCODE_API_KEY")  # replace api key (free but expires after 1000 uses)
    if not api_key:
        raise HTTPException(status_code=500, detail="Geocode API key is missing.")

    try:

        with NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name


        df = pd.read_csv(tmp_path, na_values=[""], keep_default_na=False)
        df.fillna("NA", inplace=True)

        columns_to_clean = ['full_address', 'city', 'province', 'barangay']
        for col in columns_to_clean:
            if col in df.columns:
                df[col] = df[col].apply(clean_text)
        
        def get_coordinates(address):
            return geocode_address(address, api_key)
        
        geocoded_data = df['full_address'].apply(get_coordinates)
        df['latitude'], df['longitude'] = zip(*geocoded_data)

        processed_path = tmp_path.replace('.csv', '_geocode.csv')
        df.to_csv(processed_path, index=False)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {e}")
    
    finally:
        os.remove(tmp_path) 

    return FileResponse(
            path=processed_path,
            media_type='text/csv',
            filename='[3]_geocoded_seniorhigh_file.csv'
        )


# senior high cluster
@senior_high_file_api_router.post("/api/seniorhigh-cluster-file")
async def cluster_file(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_admin)):
    try:
        
        with NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        df = pd.read_csv(tmp_path, index_col=False)
        
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            raise HTTPException(status_code=400, detail="File must contain latitude and longitude columns.")

        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')

        df.dropna(subset=['latitude', 'longitude'], inplace=True)

        if df.empty:
            raise HTTPException(status_code=400, detail="No valid data after removing missing values.")

        unique_lat_long = df[['latitude', 'longitude']].drop_duplicates()
        n_clusters = unique_lat_long.shape[0]

        X = df[['latitude', 'longitude']].values
        kmeans_address = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
        df['cluster_address'] = kmeans_address.fit_predict(X)
        
        df_cebu = df[
            df['province'].str.contains('Cebu', na=False, case=False) |
            df['full_address'].str.contains('Cebu', na=False, case=False)
        ].copy()

        if not df_cebu.empty:
            k = 6 
            kmeans_proximity = KMeans(n_clusters=k, random_state=42, n_init='auto', init='k-means++')
            df_cebu['cluster_proximity'] = kmeans_proximity.fit_predict(df_cebu[['latitude', 'longitude']].values)

            
            df = df.merge(df_cebu[['latitude', 'longitude', 'cluster_proximity']], on=['latitude', 'longitude'], how='left')
          
            df = df.groupby('stud_id', as_index=False).first()
        else:
            df['cluster_proximity'] = -1 

        df['cluster_proximity'] = df['cluster_proximity'].fillna(-1).astype(int)

        processed_path = tmp_path.replace('.csv', '_clustered.csv')
        df.to_csv(processed_path, index=False)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        os.remove(tmp_path)

    return FileResponse(
        path=processed_path,
        media_type='text/csv',
        filename='[ready_to_upload]_clustered_seniorhigh_file.csv'
    )