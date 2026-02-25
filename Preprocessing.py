import pandas as pd
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parent

RAW_DIR = ROOT / "Unprocessed Data"
DATA_DIR = ROOT / "data"

CO2_PATH = RAW_DIR / "co-emissions-per-capita" / "co-emissions-per-capita.csv"
LIFE_PATH = RAW_DIR / "life-expectancy" / "life-expectancy.csv"
FOSSIL_PATH = RAW_DIR / "fossil-fuel-consumption-by-type" / "fossil-fuel-consumption-by-type.csv"
ENERGY_PATH = RAW_DIR / "energy-use-per-person" / "energy-use-per-person.csv"

OUTPUT_PATH = DATA_DIR / "country_co2_life_filtered.csv"

# Helpers
def reset_output_file(path: Path) -> None:
    """Delete output CSV if it exists so each run is clean."""
    if path.exists():
        path.unlink()

def ensure_dir(path: Path) -> None:
    """Create directory if it does not exist."""
    path.mkdir(parents=True, exist_ok=True)

def header_as_text(df: pd.DataFrame) -> str:
    """Create a readable header string for debug/errors."""
    return " | ".join(map(str, df.columns))

def require_columns(df: pd.DataFrame, cols: list[str], name: str) -> None:
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise ValueError(
            f"{name} dataset missing required columns: {missing}\n"
            f"Detected columns:\n{header_as_text(df)}"
        )

def normalize_owid(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Standardize OWID-style id columns to country/iso3/year."""
    require_columns(df, ["Entity", "Code", "Year"], name)
    return df.rename(columns={"Entity": "country", "Code": "iso3", "Year": "year"})

def detect_value_column(cols, must_contain_all: list[str], dataset_name: str) -> str:
    """
    Detect a column by required substrings (case-insensitive).
    Example: must_contain_all=['life','expect'] finds a life expectancy column.
    """
    for col in cols:
        c = str(col).lower()
        if all(token in c for token in must_contain_all):
            return col
    raise ValueError(
        f"Could not detect value column in {dataset_name} containing tokens {must_contain_all}.\n"
        f"Detected columns:\n{list(cols)}"
    )

def to_numeric_year(df: pd.DataFrame) -> pd.DataFrame:
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df = df.dropna(subset=["year"]).copy()
    df["year"] = df["year"].astype(int)
    return df

def keep_valid_iso3(df: pd.DataFrame) -> pd.DataFrame:
    # Remove aggregates (World, regions) and keep only ISO3 country codes
    df = df[df["iso3"].notna()].copy()
    df = df[df["iso3"].astype(str).str.len() == 3].copy()
    return df

def parse_year_or_range(user_text: str) -> tuple[int, int]:
    """
    Accepts:
      - '2020'
      - '1990-2020'
    Returns (min_year, max_year)
    """
    s = user_text.strip().replace(" ", "")
    if "-" in s:
        a, b = s.split("-", 1)
        y0, y1 = int(a), int(b)
        return (min(y0, y1), max(y0, y1))
    y = int(s)
    return (y, y)

def validate_year_range_in_dataset(df: pd.DataFrame, name: str, y0: int, y1: int) -> None:
    """
    STRICT validation:
    The FULL requested year range must exist in the dataset.
    (No clamping / shrinking.)
    """
    if df.empty:
        raise ValueError(f"{name} dataset is empty after loading/cleaning.")

    min_y = int(df["year"].min())
    max_y = int(df["year"].max())

    if y0 < min_y or y1 > max_y:
        raise ValueError(
            f"Invalid year selection for {name}.\n"
            f"Requested: {y0}-{y1}\n"
            f"Available: {min_y}-{max_y}"
        )

# Setup output dir + check input files
ensure_dir(DATA_DIR)

for p in [CO2_PATH, LIFE_PATH, ENERGY_PATH, FOSSIL_PATH]:
    if not p.exists():
        raise FileNotFoundError(
            f"File not found:\n  {p}\n\n"
            f"Make sure it exists in your repo at that path."
        )

# Load CSVs
co2_raw = pd.read_csv(CO2_PATH)
life_raw = pd.read_csv(LIFE_PATH)
energy_raw = pd.read_csv(ENERGY_PATH)
fossil_raw = pd.read_csv(FOSSIL_PATH)

# Normalize id columns
co2 = normalize_owid(co2_raw, "CO2")
life = normalize_owid(life_raw, "Life expectancy")
energy = normalize_owid(energy_raw, "Energy use per person")
fossil = normalize_owid(fossil_raw, "Fossil fuel consumption by type")

# Detect / rename value columns
# CO2 file often has a column like: "Annual CO2 emissions (per capita)"
co2_value_col = detect_value_column(co2.columns, ["emissions", "per", "capita"], "CO2")
life_value_col = detect_value_column(life.columns, ["life", "expect"], "Life expectancy")
energy_value_col = detect_value_column(energy.columns, ["per", "capita", "energy"], "Energy use per person")

# Fossil file should contain: Oil, Gas, Coal
fossil_cols_lower = {str(c).lower(): c for c in fossil.columns}

def get_fossil_col(name: str) -> str:
    key = name.lower()
    if key in fossil_cols_lower:
        return fossil_cols_lower[key]
    raise ValueError(
        f"Fossil dataset missing '{name}' column.\n"
        f"Detected columns:\n{header_as_text(fossil)}"
    )

oil_col = get_fossil_col("Oil")
gas_col = get_fossil_col("Gas")
coal_col = get_fossil_col("Coal")

# Rename / select columns
co2 = co2.rename(columns={co2_value_col: "co2_per_capita"})[["country", "iso3", "year", "co2_per_capita"]]
life = life.rename(columns={life_value_col: "life_expectancy"})[["country", "iso3", "year", "life_expectancy"]]
energy = energy.rename(columns={energy_value_col: "energy_per_person"})[["country", "iso3", "year", "energy_per_person"]]
fossil = fossil.rename(columns={
    oil_col: "oil_consumption",
    gas_col: "gas_consumption",
    coal_col: "coal_consumption"
})[["country", "iso3", "year", "oil_consumption", "gas_consumption", "coal_consumption"]]

# Convert year to int everywhere
co2 = to_numeric_year(co2)
life = to_numeric_year(life)
energy = to_numeric_year(energy)
fossil = to_numeric_year(fossil)


# User input: year or range
print("\nEnter a single year (e.g., 2020) OR a year range (e.g., 1990-2020).")
year_input = input("Year or range: ")
Y0, Y1 = parse_year_or_range(year_input)

# STRICT validation: requested range must be within each dataset's coverage
validate_year_range_in_dataset(co2, "CO2", Y0, Y1)
validate_year_range_in_dataset(life, "Life expectancy", Y0, Y1)
validate_year_range_in_dataset(energy, "Energy use per person", Y0, Y1)
validate_year_range_in_dataset(fossil, "Fossil fuel consumption by type", Y0, Y1)

# Filter each dataset to requested year(s)
co2 = co2[(co2["year"] >= Y0) & (co2["year"] <= Y1)].copy()
life = life[(life["year"] >= Y0) & (life["year"] <= Y1)].copy()
energy = energy[(energy["year"] >= Y0) & (energy["year"] <= Y1)].copy()
fossil = fossil[(fossil["year"] >= Y0) & (fossil["year"] <= Y1)].copy()

# Merge datasets
# Start with the two core datasets (co2 + life) using inner join
merged = pd.merge(co2, life, on=["country", "iso3", "year"], how="inner")

# Add additional measures with LEFT joins (keeps more countries)
merged = pd.merge(
    merged,
    energy[["iso3", "year", "energy_per_person"]],
    on=["iso3", "year"],
    how="left"
)

merged = pd.merge(
    merged,
    fossil[["iso3", "year", "oil_consumption", "gas_consumption", "coal_consumption"]],
    on=["iso3", "year"],
    how="left"
)

# Keep valid ISO3
merged = keep_valid_iso3(merged)

# Convert measure columns to numeric
measure_cols = [
    "co2_per_capita",
    "life_expectancy",
    "energy_per_person",
    "oil_consumption",
    "gas_consumption",
    "coal_consumption",
]
for c in measure_cols:
    merged[c] = pd.to_numeric(merged[c], errors="coerce")

# If user picked a single year, enforce single-year output (Level 1/2/3 friendly)
if Y0 == Y1:
    merged = merged[merged["year"] == Y0].copy()

# Clean up output
# Remove duplicates just in case
merged = merged.drop_duplicates(subset=["iso3", "year"]).copy()

# Sort for a nicer CSV
merged = merged.sort_values(["country"]).reset_index(drop=True)

# Round numeric columns (adjust decimals if you want)
round_map = {
    "co2_per_capita": 3,
    "life_expectancy": 2,
    "energy_per_person": 2,
    "oil_consumption": 3,
    "gas_consumption": 3,
    "coal_consumption": 3,
}
for col, nd in round_map.items():
    if col in merged.columns:
        merged[col] = merged[col].round(nd)

# Validate output
if merged.empty:
    raise ValueError(
        f"No merged rows found for year selection {Y0}-{Y1}.\n"
        f"Possible reasons:\n"
        f" - ISO3 codes don't overlap across datasets in that time range\n"
        f" - Data columns contain missing values\n"
        f"Try a different year/range or check your source files."
    )

# Save output (overwrite each run)
reset_output_file(OUTPUT_PATH)
merged.to_csv(OUTPUT_PATH, index=False)

# Report
year_str = str(Y0) if Y0 == Y1 else f"{Y0}-{Y1}"

print("\nPreprocessing complete")
print(f"Output CSV: {OUTPUT_PATH}")
print(f"Year(s): {year_str}")
print(f"Rows: {len(merged):,}")
print(f"Countries: {merged['iso3'].nunique():,}")

missing_summary = {c: int(merged[c].isna().sum()) for c in measure_cols if c in merged.columns}
print("Missing values by column:", missing_summary)

print("\nColumns:", list(merged.columns))
print("\nSample rows:")
print(merged.head(10))