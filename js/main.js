console.log("Hello world");

let data, geoData;
let histCO2, histLife, scatterplot, mapCO2, mapLife;

const DATA_PATH = "data/country_co2_life_filtered.csv";
const GEOJSON_PATH = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// List of Measures
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

// Load the merged dataset + world geometry at the same time
Promise.all([d3.csv(DATA_PATH), d3.json(GEOJSON_PATH)])
  .then(([_data, _geoData]) => {
    console.log("Data loading complete.");
    data = _data;
    geoData = _geoData;

    // Convert strings to numbers
    data.forEach(d => {
      d.year = +d.year;

      d.co2_per_capita = +d.co2_per_capita;
      d.life_expectancy = +d.life_expectancy;

      // Level 3 extras (may be missing for many countries => NaN is OK)
      d.energy_per_person = +d.energy_per_person;
      d.oil_consumption = +d.oil_consumption;
      d.gas_consumption = +d.gas_consumption;
      d.coal_consumption = +d.coal_consumption;
    });

    // Keep only real countries (ISO3 must exist and be 3 letters)
    data = data.filter(d => d.iso3 && d.iso3.length === 3);

    // Header summary
    const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const yearText = years.length === 1 ? years[0] : `${years[0]}–${years[years.length - 1]}`;
    const countries = new Set(data.map(d => d.iso3)).size;

    d3.select("#dataset-summary").text(`Year: ${yearText} • Countries: ${countries}`);

    // Build dropdown options
    initControls();

    // Default choices (same as your Level 1 theme)
    const defaultA = "co2_per_capita";
    const defaultB = "life_expectancy";

    d3.select("#varA").property("value", defaultA);
    d3.select("#varB").property("value", defaultB);

    // Create all visualizations once
    createVisualizations(defaultA, defaultB);

    // Update all views when dropdowns change
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
  .catch(error => console.error(error));


// Populate the two dropdown menus from measures
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

/**
 * Create charts once (constructor calls initVis internally).
 * We size them for the 2-1-2 layout:
 * Row 1: two histograms
 * Row 2: scatterplot spans both columns
 * Row 3: two maps
 */
function createVisualizations(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  updateTitles(varAKey, varBKey);
  updateValidSummary(varAKey, varBKey);

  // Tuned sizes for the 3-row dashboard layout (fits like screenshot #2)
  const HIST_W = 560, HIST_H = 240;
  const SCAT_W = 1140, SCAT_H = 280;
  const MAP_W  = 560, MAP_H  = 240;

  // Histogram A (left)
  histCO2 = new Histogram({
    parentElement: "#hist-co2",
    containerWidth: HIST_W,
    containerHeight: HIST_H,
    xLabel: `${A.label} (${A.units})`,
    yLabel: "Count (with data)",
    bins: 18,
    valueAccessor: A.accessor
  }, data);

  // Histogram B (right)
  histLife = new Histogram({
    parentElement: "#hist-life",
    containerWidth: HIST_W,
    containerHeight: HIST_H,
    xLabel: `${B.label} (${B.units})`,
    yLabel: "Count (with data)",
    bins: 18,
    valueAccessor: B.accessor
  }, data);

  // Scatterplot spans both columns
  scatterplot = new Scatterplot({
    parentElement: "#scatter",
    containerWidth: SCAT_W,
    containerHeight: SCAT_H,
    xLabel: `${A.label} (${A.units})`,
    yLabel: `${B.label} (${B.units})`,
    xAccessor: A.accessor,
    yAccessor: B.accessor
  }, data);

  // Map A (left)
  mapCO2 = new ChoroplethMap({
    parentElement: "#map-co2",
    containerWidth: MAP_W,
    containerHeight: MAP_H,
    keyAccessor: d => d.iso3,
    valueAccessor: A.accessor,
    colorInterpolator: A.mapColor
  }, geoData, data);

  // Map B (right)
  mapLife = new ChoroplethMap({
    parentElement: "#map-life",
    containerWidth: MAP_W,
    containerHeight: MAP_H,
    keyAccessor: d => d.iso3,
    valueAccessor: B.accessor,
    colorInterpolator: B.mapColor
  }, geoData, data);
}

/**
 * Update charts when the dropdowns change.
 * We update the “config” properties and call updateVis().
 */
function updateDashboard(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  updateTitles(varAKey, varBKey);
  updateValidSummary(varAKey, varBKey);

  // Histogram A updates
  histCO2.config.valueAccessor = A.accessor;
  histCO2.config.xLabel = `${A.label} (${A.units})`;
  histCO2.updateVis();

  // Histogram B updates
  histLife.config.valueAccessor = B.accessor;
  histLife.config.xLabel = `${B.label} (${B.units})`;
  histLife.updateVis();

  // Scatterplot updates
  scatterplot.config.xAccessor = A.accessor;
  scatterplot.config.yAccessor = B.accessor;
  scatterplot.config.xLabel = `${A.label} (${A.units})`;
  scatterplot.config.yLabel = `${B.label} (${B.units})`;
  scatterplot.updateVis();

  // Map A updates
  mapCO2.config.valueAccessor = A.accessor;
  mapCO2.config.colorInterpolator = A.mapColor;
  mapCO2.updateVis();

  // Map B updates
  mapLife.config.valueAccessor = B.accessor;
  mapLife.config.colorInterpolator = B.mapColor;
  mapLife.updateVis();
}

/**
 * Update titles to match selected measures
 */
function updateTitles(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  d3.select("#title-hist-a").text(`Distribution • ${A.label}`);
  d3.select("#title-hist-b").text(`Distribution • ${B.label}`);
  d3.select("#title-scatter").text(`Relationship • ${A.label} vs ${B.label}`);
  d3.select("#title-map-a").text(`Map • ${A.label}`);
  d3.select("#title-map-b").text(`Map • ${B.label}`);
}

/* -------------------------
   Valid-data summaries
   (helps explain missing fossil values)
-------------------------- */

function countValidForMeasure(key) {
  const m = measures[key];
  return data.filter(d => Number.isFinite(m.accessor(d))).length;
}

function countValidForBoth(aKey, bKey) {
  const A = measures[aKey];
  const B = measures[bKey];
  return data.filter(d =>
    Number.isFinite(A.accessor(d)) && Number.isFinite(B.accessor(d))
  ).length;
}

function updateValidSummary(varAKey, varBKey) {
  const a = countValidForMeasure(varAKey);
  const b = countValidForMeasure(varBKey);
  const both = countValidForBoth(varAKey, varBKey);

  d3.select("#valid-summary").text(`Valid countries → A: ${a} • B: ${b} • Scatter: ${both}`);
}