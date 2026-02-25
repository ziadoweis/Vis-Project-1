console.log("Hello world");

let data, geoData;
let histCO2, histLife, scatterplot, mapCO2, mapLife;

const DATA_PATH = "data/country_co2_life_filtered.csv";
const GEOJSON_PATH = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// List of measures
const measures = {
  co2_per_capita: {
    label: "CO2 Emissions per Capita",
    units: "tons/person",
    accessor: d => d.co2_per_capita,
    mapColor: d3.interpolateBlues
  },
  life_expectancy: {
    label: "Life Expectancy",
    units: "years",
    accessor: d => d.life_expectancy,
    mapColor: d3.interpolateGreens
  },
  energy_per_person: {
    label: "Energy Use per Person",
    units: "per person",
    accessor: d => d.energy_per_person,
    mapColor: d3.interpolatePurples
  },
  oil_consumption: {
    label: "Oil Consumption",
    units: "consumption",
    accessor: d => d.oil_consumption,
    mapColor: d3.interpolateOranges
  },
  gas_consumption: {
    label: "Gas Consumption",
    units: "consumption",
    accessor: d => d.gas_consumption,
    mapColor: d3.interpolateReds
  },
  coal_consumption: {
    label: "Coal Consumption",
    units: "consumption",
    accessor: d => d.coal_consumption,
    mapColor: d3.interpolateGreys
  }
};

// Load the CSV and the GeoJSON
Promise.all([d3.csv(DATA_PATH), d3.json(GEOJSON_PATH)])
  .then(([_data, _geoData]) => {
    console.log("Data loading complete. Work with dataset.");
    data = _data;
    geoData = _geoData;

    console.log("Raw data (first 5 rows):", data.slice(0, 5));

    // Convert numeric columns (strings -> numbers)
    data.forEach(d => {
      d.year = +d.year;

      // Parse all measure columns; missing columns become NaN (fine)
      d.co2_per_capita = +d.co2_per_capita;
      d.life_expectancy = +d.life_expectancy;
      d.energy_per_person = +d.energy_per_person;
      d.oil_consumption = +d.oil_consumption;
      d.gas_consumption = +d.gas_consumption;
      d.coal_consumption = +d.coal_consumption;
    });

    // Keep only ISO3-coded rows (filters out aggregates)
    data = data.filter(d => d.iso3 && d.iso3.length === 3);

    console.log("Cleaned data rows:", data.length);

    // Show year in summary (single-year usually)
    const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const chosenYear = years.length === 1 ? years[0] : `${years[0]}-${years[years.length - 1]}`;

    const uniqCountries = new Set(data.map(d => d.iso3)).size;
    d3.select("#dataset-summary")
      .text(`Year: ${chosenYear} - Rows: ${d3.format(",")(data.length)} - Countries: ${d3.format(",")(uniqCountries)}`);

    // Build dropdown options
    initControls();

    // Default selections
    const defaultA = "co2_per_capita";
    const defaultB = "life_expectancy";

    d3.select("#varA").property("value", defaultA);
    d3.select("#varB").property("value", defaultB);

    // Create visualizations
    createVisualizations(defaultA, defaultB);

    // Listeners
    d3.select("#varA").on("change", () => {
      updateDashboard(
        d3.select("#varA").property("value"),
        d3.select("#varB").property("value")
      );
    });

    d3.select("#varB").on("change", () => {
      updateDashboard(
        d3.select("#varA").property("value"),
        d3.select("#varB").property("value")
      );
    });
  })
  .catch(error => {
    console.error("Error:");
    console.log(error);
  });

function initControls() {
  const keys = Object.keys(measures);

  d3.select("#varA")
    .selectAll("option")
    .data(keys)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => `${measures[d].label} (${measures[d].units})`);

  d3.select("#varB")
    .selectAll("option")
    .data(keys)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => `${measures[d].label} (${measures[d].units})`);
}

function createVisualizations(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  updateTitles(varAKey, varBKey);
  updateValidSummary(varAKey, varBKey);

  // Histogram A in #hist-co2
  histCO2 = new Histogram({
    parentElement: "#hist-co2",
    containerWidth: 520,
    containerHeight: 280,
    xLabel: `${A.label} (${A.units})`,
    yLabel: "Count of Countries (with data)",
    bins: 25,
    valueAccessor: A.accessor
  }, data);

  // Histogram B in #hist-life
  histLife = new Histogram({
    parentElement: "#hist-life",
    containerWidth: 520,
    containerHeight: 280,
    xLabel: `${B.label} (${B.units})`,
    yLabel: "Count of Countries (with data)",
    bins: 25,
    valueAccessor: B.accessor
  }, data);

  // Scatterplot A vs B
  scatterplot = new Scatterplot({
    parentElement: "#scatter",
    containerWidth: 1100,
    containerHeight: 420,
    xLabel: `${A.label} (${A.units})`,
    yLabel: `${B.label} (${B.units})`,
    xAccessor: A.accessor,
    yAccessor: B.accessor
  }, data);

  // Map A
  mapCO2 = new ChoroplethMap({
    parentElement: "#map-co2",
    containerWidth: 520,
    containerHeight: 360,
    keyAccessor: d => d.iso3,
    valueAccessor: A.accessor,
    colorInterpolator: A.mapColor
  }, geoData, data);

  // Map B
  mapLife = new ChoroplethMap({
    parentElement: "#map-life",
    containerWidth: 520,
    containerHeight: 360,
    keyAccessor: d => d.iso3,
    valueAccessor: B.accessor,
    colorInterpolator: B.mapColor
  }, geoData, data);
}

function updateDashboard(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  updateTitles(varAKey, varBKey);
  updateValidSummary(varAKey, varBKey);

  // Update histogram A
  histCO2.config.valueAccessor = A.accessor;
  histCO2.config.xLabel = `${A.label} (${A.units})`;
  histCO2.updateVis();

  // Update histogram B
  histLife.config.valueAccessor = B.accessor;
  histLife.config.xLabel = `${B.label} (${B.units})`;
  histLife.updateVis();

  // Update scatterplot
  scatterplot.config.xAccessor = A.accessor;
  scatterplot.config.yAccessor = B.accessor;
  scatterplot.config.xLabel = `${A.label} (${A.units})`;
  scatterplot.config.yLabel = `${B.label} (${B.units})`;
  scatterplot.updateVis();

  // Update maps
  mapCO2.config.valueAccessor = A.accessor;
  mapCO2.config.colorInterpolator = A.mapColor;
  mapCO2.updateVis();

  mapLife.config.valueAccessor = B.accessor;
  mapLife.config.colorInterpolator = B.mapColor;
  mapLife.updateVis();
}

function updateTitles(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  d3.select("#title-hist-a")
    .text(`Visualization 1 - ${A.label} Distribution`);

  d3.select("#title-hist-b")
    .text(`Visualization 2 - ${B.label} Distribution`);

  d3.select("#title-scatter")
    .text(`Visualization 3 - ${A.label} vs ${B.label} (all countries)`);

  d3.select("#title-map-a")
    .text(`${A.label} (${A.units})`);

  d3.select("#title-map-b")
    .text(`${B.label} (${B.units})`);
}


// Valid data summaries
function countValidForMeasure(measureKey) {
  const m = measures[measureKey];
  return data.filter(d => Number.isFinite(m.accessor(d))).length;
}

function countValidForBoth(measureKeyA, measureKeyB) {
  const A = measures[measureKeyA];
  const B = measures[measureKeyB];
  return data.filter(d =>
    Number.isFinite(A.accessor(d)) && Number.isFinite(B.accessor(d))
  ).length;
}

function updateValidSummary(varAKey, varBKey) {
  const validA = countValidForMeasure(varAKey);
  const validB = countValidForMeasure(varBKey);
  const validBoth = countValidForBoth(varAKey, varBKey);

  d3.select("#valid-summary")
    .text(
      `Valid data (countries): A = ${d3.format(",")(validA)} · B = ${d3.format(",")(validB)} · Scatter (A & B) = ${d3.format(",")(validBoth)}`
    );
}