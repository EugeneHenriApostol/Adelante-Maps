import pandas as pd
import re
import requests

# Function to clean special characters from a string
def clean_text(text):
    return re.sub(r'[^\w\s]', '', str(text))

# Define the file path
file_path = "/COLLEGE.csv"

# Attempt to load the CSV file with different encodings
encodings = ['ISO-8859-1']
df = None

for encoding in encodings:
    try:
        df = pd.read_csv(file_path, encoding=encoding, na_values=[""], keep_default_na=False)
        print(f"File successfully read with {encoding} encoding.")
        break
    except Exception as e:
        print(f"Error reading the file with {encoding} encoding: {e}")

if df is None:
    print("Failed to read the file with available encodings.")
    exit()

print(f"Total rows in the data: {len(df)}")

# Fill blank cells with 'NA'
df.fillna("NA", inplace=True)

# Clean special characters in the specified columns
columns_to_clean = ['previous_school']
for col in columns_to_clean:
    if col in df.columns:
        df[col] = df[col].apply(clean_text)
    else:
        print(f"Warning: Column '{col}' not found in the data.")

# Function to geocode an address using the Here API
def geocode_address(school):
    if not school or school.strip().lower() == "na":
        return None, None

    api_key = "Fb6Yb4tbwP9ffSMTEWihOXTSTAp6C9KbUf7CYDoWMvA"
    url = "https://geocode.search.hereapi.com/v1/geocode"
    address = f"{school}, Philippines"  # add country context
    params = {
        "q": address,
        "apiKey": api_key
    }

    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            if data['items']:
                lat = data['items'][0]['position']['lat']
                lng = data['items'][0]['position']['lng']
                print(f"'{school}' is geocoded successfully [{lat}, {lng}]")
                return lat, lng
            else:
                print(f"No result for: {school}")
                return None, None
        else:
            print(f"Error geocoding address '{school}': {response.status_code}")
            return None, None
    except Exception as e:
        print(f"Error during geocoding for '{school}': {e}")
        return None, None

# Control how many rows to geocode
num_rows_to_geocode = 5
subset_indices = df.head(num_rows_to_geocode).index

# Geocode selected rows with logging
geocoded_data = df.loc[subset_indices, 'previous_school'].apply(geocode_address)
df.loc[subset_indices, 'prev_latitude'], df.loc[subset_indices, 'prev_longitude'] = zip(*geocoded_data)

# Output file path
output_file_path = "D:/Thesis/College_prev_school_geocode_1.csv"
df.to_csv(output_file_path, index=False)

print(f"Geocoding completed and saved to {output_file_path}")