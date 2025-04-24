import math, io, os ,re, html
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv
from fastapi import File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd
from sklearn.metrics import silhouette_score

import models, auth

from fastapi import APIRouter, Depends
from sklearn.cluster import KMeans
import requests

from rapidfuzz import process, fuzz
from collections import defaultdict

from kneed import KneeLocator

college_file_api_router = APIRouter()

load_dotenv()

def clean_strand(strand):
    return re.sub(r"^\d{2}", "", strand).strip()


def clean_text(text):
    return re.sub(r'[^\w\s]', '', str(text))

# geocode address function    
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
            return 0, 0
    else:
        print(f"Error geocoding {address}: {response.status_code}")
        return 0, 0

# clean previous school name function
def clean_previous_school_name(name: str):
    name = html.unescape(name)

    name = re.sub(r'\(.*?\)', '', name)

    name = re.sub(r'\d+', '', name)

    name = re.sub(r"[^A-Za-z\s]", '', name)

    name = ' '.join(name.split()).strip()

    name = name.upper()
    
    return name


# fuzzy matching for previous school
def group_similar_schools(school_series, threshold=85):
    def get_canonical_school_name(school_name):
        return mapping.get(school_name, school_name)

    cleaned_schools = school_series.unique().tolist()
    grouped = {}
    assigned = set()

    for i, name in enumerate(cleaned_schools):
        if name in assigned:
            continue
        grouped[name] = [name]
        assigned.add(name)

        for j in range(i + 1, len(cleaned_schools)):
            candidate = cleaned_schools[j]
            if candidate in assigned:
                continue
            score = fuzz.ratio(name, candidate)
            if score >= threshold:
                grouped[name].append(candidate)
                assigned.add(candidate)

    mapping = {}
    for canonical, variants in grouped.items():
        for variant in variants:
            mapping[variant] = canonical

    return school_series.map(get_canonical_school_name)

# geocode previous school function
def geocode_previous_school(school: str, barangay: str = "", city: str = "", province: str =""):
    if not school or school.strip().lower() == "na":
        return 0, 0

    clean_school = clean_text(school)
    
    query_parts = [clean_school]

    if barangay:
        query_parts.append(barangay.title())
    if city:
        query_parts.append(city.title())
    if province:
        query_parts.append(province.title())
    query_parts.append("Philippines")

    query_address = ", ".join(query_parts)
    
    api_key_prev = os.getenv("GEOCODE_API_KEY") 
    if not api_key_prev:
        raise HTTPException(status_code=500, detail="Geocode API key for previous schools is missing.")
    
    url = "https://geocode.search.hereapi.com/v1/geocode"
    params = {"q": query_address, "apiKey": api_key_prev}
    response = requests.get(url, params=params)
    
    try:
        url = "https://geocode.search.hereapi.com/v1/geocode"
        params = {"q": query_address, "apiKey": api_key_prev}
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data.get('items'):
            lat = data['items'][0]['position']['lat']
            lng = data['items'][0]['position']['lng']
            return lat, lng
    except Exception as e:
        print(f"Geocoding failed for: {query_address} - Error: {e}")
    
    return 0, 0

# preprocess college file function
def preprocess_file_college(file_path: str):
    try:
        # read the raw CSV file
        df = pd.read_csv(file_path, header=None)  
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {e}")
    
    api_key = os.getenv("GEOCODE_API_KEY")  # replace api key (free but expires after 1000 uses)
    if not api_key:
        raise HTTPException(status_code=500, detail="Geocode API key is missing.")

    # define the expected column names 
    expected_columns = [
        "year", "course", "age", "strand", 
        "previous_school", "city", "province", "barangay"
    ]

    # assign column names to match the uploaded CSV
    df.columns = expected_columns

    # add incremental student ID
    df.insert(0, "stud_id", range(1, len(df) + 1))

    # fill missing values
    df["year"] = df["year"].fillna("N/A").astype(str).str.strip()
    df["course"] = df["course"].fillna("N/A").astype(str).str.strip()
    df["age"] = pd.to_numeric(df["age"], errors="coerce").fillna(0)
    df["strand"] = df["strand"].fillna("N/A").astype(str).str.strip()
    df["previous_school"] = df["previous_school"].fillna("Unknown").str.strip()
    df["city"] = df["city"].fillna("Unknown").str.strip()
    df["province"] = df["province"].fillna("Unknown").str.strip()
    df["barangay"] = df["barangay"].fillna("Unknown").str.strip()

    df["barangay"] = df["barangay"].str.strip().str.title()
    df["city"] = df["city"].str.strip().str.title()
    df["province"] = df["province"].str.strip().str.title()

    df["strand"] = df["strand"].apply(clean_strand)

    df["previous_school"] = df["previous_school"].apply(clean_previous_school_name)
    df["previous_school"] = group_similar_schools(df["previous_school"])

    # create the full address column by concatenating city, province, and barangay columns
    df["full_address"] = (
        df["barangay"] + ", " + df["city"] + ", " + df["province"]
    ).str.strip()

    # geocode 
    def get_coordinates(address):
            return geocode_address(address, api_key)
        
    geocoded_data = df['full_address'].apply(get_coordinates)
    df['latitude'], df['longitude'] = zip(*geocoded_data)

    # cluster part
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce').fillna(0)
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce').fillna(0)

    valid_coordinates = df[(df['latitude'] != 0) & (df['longitude'] != 0)].copy()

    if not valid_coordinates.empty:
        n = len(valid_coordinates)
        upper_k = round(math.sqrt(n / 2))
        print(f"Sample size (all valid students): {n}")
        print(f"Upper limit for k (√(n/2)): {upper_k}")

        coords = valid_coordinates[['latitude', 'longitude']].values
        wcss = []

        for k in range(2, max(3, upper_k + 1)):
            kmeans = KMeans(n_clusters=k, random_state=42, init='k-means++')
            kmeans.fit(coords)
            wcss.append(kmeans.inertia_)

        kl = KneeLocator(range(2, max(3, upper_k + 1)), wcss, curve='convex', direction='decreasing')
        best_k = kl.elbow if kl.elbow is not None else 2  

        print(f"✅ Optimal k based on Elbow Method: {best_k}")

        kmeans_final = KMeans(n_clusters=best_k, random_state=42, init='k-means++')
        valid_coordinates['cluster'] = kmeans_final.fit_predict(coords) + 1

        # merge back to main dataframe
        df = df.merge(
            valid_coordinates[['stud_id', 'cluster']],
            on='stud_id',
            how='left'
        )
    else:
        df['cluster'] = -1

    df['cluster'] = df['cluster'].fillna(-1).astype(int)


    # geocode previous school part
    def geocode_prev_school_from_row(row):
        return geocode_previous_school(
            row['previous_school'],
            row['barangay'],
            row['city'],
            row['province']
        )

    geocoded_prev_school = df.apply(geocode_prev_school_from_row, axis=1)
    df['prev_latitude'], df['prev_longitude'] = zip(*geocoded_prev_school)

    df['prev_latitude'] = df['prev_latitude'].fillna(0)
    df['prev_longitude'] = df['prev_longitude'].fillna(0)

    # save the cleaned file
    output_path = file_path.replace(".csv", "_processed.csv")
    df.to_csv(output_path, index=False)
    return output_path


# upload raw college file api
@college_file_api_router.post("/api/upload/raw/college-file")
async def upload_file(file: UploadFile = File(...)):
    # validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        processed_path = preprocess_file_college(tmp_path)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)  


    return FileResponse(
        path=processed_path,
        media_type='text/csv',
        filename="[1]_preprocessed_college_file.csv"
    )