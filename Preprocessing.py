import pandas as pd
from pathlib import Path

# --------------------------------------------------
# Paths (script in project root)
# --------------------------------------------------
ROOT = Path(__file__).resolve().parent

RAW_DIR = ROOT / "Unprocessed Data"
DATA_DIR = ROOT / "data"

CO2_PATH = RAW_DIR / "co-emissions-per-capita" / "co-emissions-per-capita.csv"
LIFE_PATH = RAW_DIR / "life-expectancy" / "life-expectancy.csv"
OUTPUT_PATH = DATA_DIR / "country_co2_life_filtered.csv"

# --------------------------------------------------
# Helpers
# --------------------------------------------------
def ensure_data_dir(path: Path) -> None:
    """Create data directory if it does not exist."""
    path.mkdir(parents=True, exist_ok=True)

def reset_output_file(path: Path) -> None:
    """Delete output CSV if it exists so each run is clean."""
    if path.exists():
        path.unlink()

def parse_year_input(user_text: str) -> tuple[int, int]:
    """
    Accepts:
      - '1990'
      - '1950-2023'
    Returns (min_year, max_year)
    """
    s = user_text.strip().replace(" ", "")
    if "-" in s:
        a, b = s.split("-", 1)
        return min(int(a), int(b)), max(int(a), int(b))
    y = int(s)
    return y, y

def detect_value_column(cols, must_contain_all):
    """Detect a column by required substrings (case-insensitive)."""
    for col in cols:
        c = str(col).lower()
        if all(token in c for token in must_contain_all):
            return col
    raise ValueError(
        f"Could not detect column containing {must_contain_all}. "
        f"Detected columns: {list(cols)}"
    )

# --------------------------------------------------
# Ensure output directory exists
# --------------------------------------------------
ensure_data_dir(DATA_DIR)

# --------------------------------------------------
# Load datasets
# --------------------------------------------------
co2 = pd.read_csv(CO2_PATH)
life = pd.read_csv(LIFE_PATH)

# --------------------------------------------------
# Convert headers to text string (.join approach)
# --------------------------------------------------
co2_header_text = " | ".join(map(str, co2.columns))
life_header_text = " | ".join(map(str, life.columns))

required_id_cols = ["Entity", "Code", "Year"]

for name, df, header_text in [
    ("CO2", co2, co2_header_text),
    ("Life expectancy", life, life_header_text),
]:
    missing = [c for c in required_id_cols if c not in df.columns]
    if missing:
        raise ValueError(
            f"{name} dataset missing required columns: {missing}\n"
            f"Detected columns:\n{header_text}"
        )

# --------------------------------------------------
# Detect value columns
# --------------------------------------------------
co2_value_col = detect_value_column(co2.columns, ["emissions", "per capita"])
life_value_col = detect_value_column(life.columns, ["life", "expect"])

# --------------------------------------------------
# Rename to clean column names
# --------------------------------------------------
co2 = co2.rename(columns={
    "Entity": "country",
    "Code": "iso3",
    "Year": "year",
    co2_value_col: "co2_per_capita"
})

life = life.rename(columns={
    "Entity": "country",
    "Code": "iso3",
    "Year": "year",
    life_value_col: "life_expectancy"
})

# --------------------------------------------------
# Keep only needed columns
# --------------------------------------------------
co2 = co2[["country", "iso3", "year", "co2_per_capita"]]
life = life[["country", "iso3", "year", "life_expectancy"]]

# --------------------------------------------------
# Ensure numeric year
# --------------------------------------------------
co2["year"] = pd.to_numeric(co2["year"], errors="coerce")
life["year"] = pd.to_numeric(life["year"], errors="coerce")

co2 = co2.dropna(subset=["year"])
life = life.dropna(subset=["year"])

co2["year"] = co2["year"].astype(int)
life["year"] = life["year"].astype(int)

# --------------------------------------------------
# Merge datasets
# --------------------------------------------------
merged = pd.merge(co2, life, on=["country", "iso3", "year"], how="inner")

# Remove aggregate regions (World, etc.)
merged = merged[
    merged["iso3"].notna() &
    (merged["iso3"].astype(str).str.len() == 3)
]

# --------------------------------------------------
# User input: year or range
# --------------------------------------------------
print("\nChoose the year(s) to include:")
print("Examples: 1990   OR   1950-2023")
year_input = input("Enter year or range: ")

min_year, max_year = parse_year_input(year_input)

data_min, data_max = int(merged["year"].min()), int(merged["year"].max())
min_year = max(min_year, data_min)
max_year = min(max_year, data_max)

filtered = merged[
    (merged["year"] >= min_year) &
    (merged["year"] <= max_year)
].copy()

if filtered.empty:
    raise ValueError(
        f"No data available for {min_year}-{max_year}. "
        f"Available range is {data_min}-{data_max}."
    )

# --------------------------------------------------
# Save output (overwrite each run)
# --------------------------------------------------
reset_output_file(OUTPUT_PATH)
filtered.to_csv(OUTPUT_PATH, index=False)

# --------------------------------------------------
# Report
# --------------------------------------------------
print("\nPreprocessing complete")
print("Output CSV:", OUTPUT_PATH)
print("Rows:", len(filtered))
print("Countries:", filtered["iso3"].nunique())
print("Year range:", filtered["year"].min(), "-", filtered["year"].max())
print("\nSample rows:")
print(filtered.head(10))