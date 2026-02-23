console.log("Hello world");

let data, histCO2, histLife, scatterplot, mapCO2, mapLife, geoData;

const DATA_PATH = "data/country_co2_life_filtered.csv";
const GEOJSON_PATH = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// Load the CSV and the GeoJSON
Promise.all([d3.csv(DATA_PATH), d3.json(GEOJSON_PATH)])
  .then(([_data, _geoData]) => {
    console.log("Data loading complete. Work with dataset.");
    data = _data;
    geoData = _geoData;

    console.log("Raw data (first 5 rows):", data.slice(0, 5));

    // Process / clean the data (strings -> numbers)
    data.forEach(d => {
      d.year = +d.year;
      d.co2 = +d.co2_per_capita;
      d.life = +d.life_expectancy;
      // country, iso3 remain strings
    });

    // Filter out invalid rows (defensive programming)
    data = data.filter(d =>
      d.iso3 && d.iso3.length === 3 &&
      Number.isFinite(d.co2) &&
      Number.isFinite(d.life)
    );

    console.log("Cleaned data rows:", data.length);

    const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const chosenYear = years.length === 1 ? years[0] : `${years[0]}-${years[years.length - 1]}`;

    const uniqCountries = new Set(data.map(d => d.iso3)).size;
    d3.select("#dataset-summary")
      .text(`Year: ${chosenYear} - Rows: ${d3.format(",")(data.length)} - Countries: ${d3.format(",")(uniqCountries)}`);

    // Level 1 visualizations

    // Visualization 1: CO2 histogram
    histCO2 = new Histogram({
      parentElement: "#hist-co2",
      containerWidth: 520,
      containerHeight: 280,
      xLabel: "CO2 Emissions per Capita (tons/person)",
      yLabel: "Count of Countries",
      bins: 25,
      valueAccessor: d => d.co2
    }, data);

    // Visualization 2: Life histogram
    histLife = new Histogram({
      parentElement: "#hist-life",
      containerWidth: 520,
      containerHeight: 280,
      xLabel: "Life Expectancy (years)",
      yLabel: "Count of Countries",
      bins: 25,
      valueAccessor: d => d.life
    }, data);

    // Visualization 3: Scatterplot
    scatterplot = new Scatterplot({
      parentElement: "#scatter",
      containerWidth: 1100,
      containerHeight: 420,
      xLabel: "Life Expectancy (years)",
      yLabel: "CO2 Emissions per Capita (tons/person)",
      xAccessor: d => d.life,
      yAccessor: d => d.co2
    }, data);

    // Level 2 visualizations (maps)

    // Visualization 4: Choropleth map for CO2
    mapCO2 = new ChoroplethMap({
      parentElement: "#map-co2",
      containerWidth: 520,
      containerHeight: 360,
      keyAccessor: d => d.iso3,       
      valueAccessor: d => d.co2,      
      colorInterpolator: d3.interpolateBlues
    }, geoData, data);

    // Visualization 5: Choropleth map for Life Expectancy
    mapLife = new ChoroplethMap({
      parentElement: "#map-life",
      containerWidth: 520,
      containerHeight: 360,
      keyAccessor: d => d.iso3,
      valueAccessor: d => d.life,
      colorInterpolator: d3.interpolateGreens
    }, geoData, data);

  })
  .catch(error => {
    console.error("Error:");
    console.log(error);
  });