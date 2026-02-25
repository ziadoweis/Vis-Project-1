console.log("Hello world");

let data, geoData;

// Visualization instances
let histA, histB, scatterplot, mapA, mapB;

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

/**
 * Level 5 brushing state:
 * - histARange: [min,max] in data space for variable A
 * - histBRange: [min,max] in data space for variable B
 * - scatterExtent: {x:[min,max], y:[min,max]} in data space
 *
 * Selection is computed as the INTERSECTION of all active brushes.
 */
const brushState = {
  histARange: null,
  histBRange: null,
  scatterExtent: null
};

// Load data + geojson
Promise.all([d3.csv(DATA_PATH), d3.json(GEOJSON_PATH)])
  .then(([_data, _geoData]) => {
    data = _data;
    geoData = _geoData;

    // Parse numeric fields (CSV loads strings)
    data.forEach(d => {
      d.year = +d.year;

      d.co2_per_capita = +d.co2_per_capita;
      d.life_expectancy = +d.life_expectancy;

      d.energy_per_person = +d.energy_per_person;
      d.oil_consumption = +d.oil_consumption;
      d.gas_consumption = +d.gas_consumption;
      d.coal_consumption = +d.coal_consumption;
    });

    // Keep real countries only
    data = data.filter(d => d.iso3 && d.iso3.length === 3);

    // Summary text
    const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const yearText = years.length === 1 ? years[0] : `${years[0]}–${years[years.length - 1]}`;
    const countries = new Set(data.map(d => d.iso3)).size;

    d3.select("#dataset-summary").text(`Year: ${yearText} • Countries: ${countries}`);

    // Populate dropdowns
    initControls();

    // Default focus for your theme (feel free to change defaults)
    const defaultA = "energy_per_person";
    const defaultB = "life_expectancy";

    d3.select("#varA").property("value", defaultA);
    d3.select("#varB").property("value", defaultB);

    // Create charts
    createVisualizations(defaultA, defaultB);

    // Dropdown listeners
    d3.select("#varA").on("change", () => {
      updateDashboard(d3.select("#varA").property("value"), d3.select("#varB").property("value"));
    });

    d3.select("#varB").on("change", () => {
      updateDashboard(d3.select("#varA").property("value"), d3.select("#varB").property("value"));
    });
  })
  .catch(error => console.error(error));

// Controls
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


// Create + Update

function createVisualizations(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  // Reset brushes when we first build
  brushState.histARange = null;
  brushState.histBRange = null;
  brushState.scatterExtent = null;

  updateTitles(varAKey, varBKey);
  updateValidSummary(varAKey, varBKey);

  // These should match your CSS fixed row heights
  const HIST_W = 560, HIST_H = 240;
  const SCAT_W = 1140, SCAT_H = 280;
  const MAP_W  = 560, MAP_H  = 240;

  // Histogram A
  histA = new Histogram({
    parentElement: "#hist-co2",
    containerWidth: HIST_W,
    containerHeight: HIST_H,
    xLabel: `${A.label} (${A.units})`,
    yLabel: "Count of Countries",
    bins: 18,
    valueAccessor: A.accessor,

    // Level 5 brushing callback
    onBrush: (range) => {
      brushState.histARange = range;    // range is [min,max] or null
      applyLinkedSelection();
    }
  }, data);

  // Histogram B
  histB = new Histogram({
    parentElement: "#hist-life",
    containerWidth: HIST_W,
    containerHeight: HIST_H,
    xLabel: `${B.label} (${B.units})`,
    yLabel: "Count of Countries",
    bins: 18,
    valueAccessor: B.accessor,
    onBrush: (range) => {
      brushState.histBRange = range;
      applyLinkedSelection();
    }
  }, data);

  // Scatterplot
  scatterplot = new Scatterplot({
    parentElement: "#scatter",
    containerWidth: SCAT_W,
    containerHeight: SCAT_H,
    xLabel: `${A.label} (${A.units})`,
    yLabel: `${B.label} (${B.units})`,
    xAccessor: A.accessor,
    yAccessor: B.accessor,

    // Level 5 brushing callback
    onBrush: (extent) => {
      // extent is { x:[min,max], y:[min,max] } or null
      brushState.scatterExtent = extent;
      applyLinkedSelection();
    }
  }, data);

  // Map A
  mapA = new ChoroplethMap({
    parentElement: "#map-co2",
    containerWidth: MAP_W,
    containerHeight: MAP_H,
    keyAccessor: d => d.iso3,
    valueAccessor: A.accessor,
    colorInterpolator: A.mapColor
  }, geoData, data);

  // Map B
  mapB = new ChoroplethMap({
    parentElement: "#map-life",
    containerWidth: MAP_W,
    containerHeight: MAP_H,
    keyAccessor: d => d.iso3,
    valueAccessor: B.accessor,
    colorInterpolator: B.mapColor
  }, geoData, data);

  // No selection initially
  applyLinkedSelection();
}

function updateDashboard(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  updateTitles(varAKey, varBKey);
  updateValidSummary(varAKey, varBKey);

  // If the user changes variables, we clear brushes (otherwise old ranges mean nothing).
  brushState.histARange = null;
  brushState.histBRange = null;
  brushState.scatterExtent = null;

  // Update accessors/labels and recompute scales/bins
  histA.config.valueAccessor = A.accessor;
  histA.config.xLabel = `${A.label} (${A.units})`;
  histA.clearBrush();
  histA.updateVis();

  histB.config.valueAccessor = B.accessor;
  histB.config.xLabel = `${B.label} (${B.units})`;
  histB.clearBrush();
  histB.updateVis();

  scatterplot.config.xAccessor = A.accessor;
  scatterplot.config.yAccessor = B.accessor;
  scatterplot.config.xLabel = `${A.label} (${A.units})`;
  scatterplot.config.yLabel = `${B.label} (${B.units})`;
  scatterplot.clearBrush();
  scatterplot.updateVis();

  mapA.config.valueAccessor = A.accessor;
  mapA.config.colorInterpolator = A.mapColor;
  mapA.updateVis();

  mapB.config.valueAccessor = B.accessor;
  mapB.config.colorInterpolator = B.mapColor;
  mapB.updateVis();

  applyLinkedSelection();
}

// Linked selection logic

/**
 * Compute the selected ISO3 set as intersection of active brushes.
 * We keep scales fixed; selection only changes emphasis (opacity).
 */
function computeSelectedISO3() {
  const varAKey = d3.select("#varA").property("value");
  const varBKey = d3.select("#varB").property("value");
  const A = measures[varAKey];
  const B = measures[varBKey];

  // Start with all countries
  let selected = data.filter(d => d.iso3 && d.iso3.length === 3);

  // Histogram A range filter
  if (brushState.histARange) {
    const [minA, maxA] = brushState.histARange;
    selected = selected.filter(d => {
      const v = A.accessor(d);
      return Number.isFinite(v) && v >= minA && v <= maxA;
    });
  }

  // Histogram B range filter
  if (brushState.histBRange) {
    const [minB, maxB] = brushState.histBRange;
    selected = selected.filter(d => {
      const v = B.accessor(d);
      return Number.isFinite(v) && v >= minB && v <= maxB;
    });
  }

  // Scatter extent filter
  if (brushState.scatterExtent) {
    const { x, y } = brushState.scatterExtent;
    const [xmin, xmax] = x;
    const [ymin, ymax] = y;

    selected = selected.filter(d => {
      const xv = A.accessor(d);
      const yv = B.accessor(d);
      return Number.isFinite(xv) && Number.isFinite(yv) &&
        xv >= xmin && xv <= xmax &&
        yv >= ymin && yv <= ymax;
    });
  }

  return new Set(selected.map(d => d.iso3));
}

function applyLinkedSelection() {
  const anyActive = !!(brushState.histARange || brushState.histBRange || brushState.scatterExtent);
  const selectedSet = anyActive ? computeSelectedISO3() : null;

  // Pass selection into every view (they fade non-selected)
  histA.setSelection(selectedSet);
  histB.setSelection(selectedSet);
  scatterplot.setSelection(selectedSet);
  mapA.setSelection(selectedSet);
  mapB.setSelection(selectedSet);
}

// Titles + summaries
function updateTitles(varAKey, varBKey) {
  const A = measures[varAKey];
  const B = measures[varBKey];

  d3.select("#title-hist-a").text(`Distribution • ${A.label}`);
  d3.select("#title-hist-b").text(`Distribution • ${B.label}`);
  d3.select("#title-scatter").text(`Relationship • ${A.label} vs ${B.label}`);
  d3.select("#title-map-a").text(`Map • ${A.label}`);
  d3.select("#title-map-b").text(`Map • ${B.label}`);
}

function countValidForMeasure(key) {
  const m = measures[key];
  return data.filter(d => Number.isFinite(m.accessor(d))).length;
}

function countValidForBoth(aKey, bKey) {
  const A = measures[aKey];
  const B = measures[bKey];
  return data.filter(d => Number.isFinite(A.accessor(d)) && Number.isFinite(B.accessor(d))).length;
}

function updateValidSummary(varAKey, varBKey) {
  const a = countValidForMeasure(varAKey);
  const b = countValidForMeasure(varBKey);
  const both = countValidForBoth(varAKey, varBKey);
  d3.select("#valid-summary").text(`Valid countries → A: ${a} • B: ${b} • Scatter: ${both}`);
}