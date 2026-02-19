import pandas as pd
from pathlib import Path

# --------------------------------------------------
# Paths (script is in project root)
# --------------------------------------------------
ROOT = Path(__file__).resolve().parent

CO2_PATH = ROOT / "Unprocessed Data" / "co-emissions-per-capita" / "co-emissions-per-capita.csv"
LIFE_PATH = ROOT / "Unprocessed Data" / "life-expectancy" / "life-expectancy.csv"
OUTPUT_PATH = ROOT / "country_co2_life_1950_2023.csv"

# --------------------------------------------------
# Helper: delete/override output file each run
# --------------------------------------------------
def reset_output_file(path: Path) -> None:
    """Delete output CSV if it exists so each run is clean."""
    if path.exists():
        path.unlink()

# --------------------------------------------------
# Load datasets
# --------------------------------------------------
co2 = pd.read_csv(CO2_PATH)
life = pd.read_csv(LIFE_PATH)

# --------------------------------------------------
# Convert headers to text string (.join approach)
# --------------------------------------------------
co2_header_text = " | ".join([str(c) for c in co2.columns])
life_header_text = " | ".join([str(c) for c in life.columns])

required_id_cols = ["Entity", "Code", "Year"]

# Validate ID columns
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
# Detect value columns from header text
# --------------------------------------------------
co2_value_col = None
for col in co2.columns:
    c = str(col).lower()
    if "emissions" in c and "per capita" in c and "co" in c:
        co2_value_col = col
        break

if co2_value_col is None:
    raise ValueError(
        "Could not detect CO₂-per-capita column.\n"
        f"Detected columns:\n{co2_header_text}"
    )

life_value_col = None
for col in life.columns:
    c = str(col).lower()
    if "life" in c and "expect" in c:
        life_value_col = col
        break

if life_value_col is None:
    raise ValueError(
        "Could not detect life expectancy column.\n"
        f"Detected columns:\n{life_header_text}"
    )

# --------------------------------------------------
# Rename columns to clean names
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
# Merge datasets (shared countries + shared years)
# --------------------------------------------------
merged = pd.merge(
    co2,
    life,
    on=["country", "iso3", "year"],
    how="inner"
)

# --------------------------------------------------
# Remove aggregate regions
# --------------------------------------------------
merged = merged[
    merged["iso3"].notna() &
    (merged["iso3"].astype(str).str.len() == 3)
]

# --------------------------------------------------
# Restrict to shared year range
# --------------------------------------------------
YEAR_MIN, YEAR_MAX = 1950, 2023
merged = merged[(merged["year"] >= YEAR_MIN) & (merged["year"] <= YEAR_MAX)]

# --------------------------------------------------
# Reset output + save
# --------------------------------------------------
reset_output_file(OUTPUT_PATH)
merged.to_csv(OUTPUT_PATH, index=False)

# --------------------------------------------------
# Report
# --------------------------------------------------
print("Preprocessing complete")
print("Output:", OUTPUT_PATH)
print("Rows:", len(merged))
print("Countries:", merged["iso3"].nunique())
print("Year range:", merged["year"].min(), "-", merged["year"].max())
print("\nSample rows:")
print(merged.head(10))