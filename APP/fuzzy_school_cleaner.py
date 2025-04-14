import pandas as pd
import re
from rapidfuzz import fuzz


def clean_school_name(name: str) -> str:
    if not isinstance(name, str):
        return "unknown"

    # Basic cleanup
    name = name.lower()
    name = re.sub(r"\([^)]*\)", "", name)              # remove parenthesis content
    name = re.sub(r"[^a-zA-Z\-.\'\s]", "", name)       # remove special chars (keeps letters, dash, dot, apostrophe)
    name = re.sub(r"\s+", " ", name)                   # collapse multiple spaces
    name = name.strip()

    return name


def cluster_school_names(names, threshold=90):
    grouped = {}

    for name in names:
        cleaned = clean_school_name(name)
        match = None
        for canon in grouped:
            if fuzz.ratio(cleaned, canon) >= threshold:
                match = canon
                break

        if match:
            grouped[match].append(name)
        else:
            grouped[cleaned] = [name]

    return grouped


def get_canonical_map(grouped_dict):
    mapping = {}
    for canon, variants in grouped_dict.items():
        # Pick the most frequent variant as canonical representative
        representative = max(set(variants), key=variants.count)
        for variant in variants:
            mapping[variant.lower()] = representative
    return mapping


def apply_school_name_cleaning(df: pd.DataFrame) -> pd.DataFrame:
    if "previous_school" not in df.columns:
        raise ValueError("DataFrame must contain a 'previous_school' column")

    school_names = df["previous_school"].dropna().unique()
    clustered = cluster_school_names(school_names)
    school_name_map = get_canonical_map(clustered)

    df["previous_school_cleaned"] = df["previous_school"].map(
        lambda x: school_name_map.get(x.lower(), x) if isinstance(x, str) else x
    )
    return df


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python fuzzy_school_cleaner.py <path_to_csv>")
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        df = pd.read_csv(file_path, encoding="utf-8")
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(file_path, encoding="ISO-8859-1")
        except Exception as e:
            print(f"Error reading file: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    if "previous_school" not in df.columns:
        print("Error: 'previous_school' column not found in the CSV.")
        sys.exit(1)

    cleaned_df = apply_school_name_cleaning(df)

    # Show preview of original vs cleaned
    preview = cleaned_df[["previous_school", "previous_school_cleaned"]].drop_duplicates()
    print("\nPreview of cleaned school names:\n")
    print(preview.head(20).to_string(index=False))

    # Optional: save cleaned file
    output_path = file_path.replace(".csv", "_cleaned.csv")
    cleaned_df.to_csv(output_path, index=False)
    print(f"\n✅ Cleaned CSV saved to: {output_path}")
