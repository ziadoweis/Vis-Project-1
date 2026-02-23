console.log("Hello world");

let data, histCO2, histLife, scatterplot;

const DATA_PATH = "data/country_co2_life_filtered.csv";

d3.csv(DATA_PATH)
  .then(_data => {
    console.log("Data loading complete. Work with dataset.");
    data = _data;
    console.log("Raw data (first 5 rows):", data.slice(0, 5));

    // Process / clean the data (strings → numbers)
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

    // Optional: update page summary
    const uniqCountries = new Set(data.map(d => d.iso3)).size;
    d3.select("#dataset-summary")
      .text(`Rows: ${d3.format(",")(data.length)}  Countries: ${d3.format(",")(uniqCountries)}`);

    // Create visualization instances
    histCO2 = new Histogram({
      parentElement: "#hist-co2",
      containerWidth: 520,
      containerHeight: 280,
      xLabel: "CO2 Emissions per Capita (tons/person)",
      yLabel: "Count of Countries",
      bins: 25,
      valueAccessor: d => d.co2
    }, data);

    histLife = new Histogram({
      parentElement: "#hist-life",
      containerWidth: 520,
      containerHeight: 280,
      xLabel: "Life Expectancy (years)",
      yLabel: "Count of Countries",
      bins: 25,
      valueAccessor: d => d.life
    }, data);

    scatterplot = new Scatterplot({
      parentElement: "#scatter",
      containerWidth: 1100,
      containerHeight: 420,
      xLabel: "Life Expectancy (years)",
      yLabel: "CO2 Emissions per Capita (tons/person)",
      xAccessor: d => d.life,
      yAccessor: d => d.co2
    }, data);

  })
  .catch(error => {
    console.error("Error:");
    console.log(error);
  });