class Histogram {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,         // selector like "#hist-co2"
      containerWidth: _config.containerWidth || 520,
      containerHeight: _config.containerHeight || 280,
      margin: _config.margin || { top: 10, right: 18, bottom: 55, left: 60 },
      xLabel: _config.xLabel || "",
      yLabel: _config.yLabel || "Count",
      bins: _config.bins || 25,
      valueAccessor: _config.valueAccessor          // function like d => d.co2
    };

    this.data = _data;

    this.initVis();
  }

  initVis() {
    let vis = this;

    // Inner chart size (excluding margins)
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Scales (domains set later in updateVis)
    vis.xScale = d3.scaleLinear().range([0, vis.width]);
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    // SVG drawing area
    vis.svg = d3.select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    // Chart group (margin convention)
    vis.chart = vis.svg.append("g")
      .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Axis generators (scales plugged in here)
    vis.xAxis = d3.axisBottom(vis.xScale).ticks(6);
    vis.yAxis = d3.axisLeft(vis.yScale).ticks(6).tickFormat(d3.format("d"));

    // Axis groups (drawn/updated in renderVis)
    vis.xAxisG = vis.chart.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${vis.height})`);

    vis.yAxisG = vis.chart.append("g")
      .attr("class", "axis y-axis");

    // Group for bars
    vis.barsG = vis.chart.append("g")
      .attr("class", "bars");

    // Axis labels
    vis.xLabel = vis.chart.append("text")
      .attr("class", "label x-label")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 45)
      .attr("text-anchor", "middle")
      .text(vis.config.xLabel);

    vis.yLabel = vis.chart.append("text")
      .attr("class", "label y-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -vis.height / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .text(vis.config.yLabel);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    // 1) Extract values we are histogramming
    vis.values = vis.data
      .map(vis.config.valueAccessor)
      .filter(v => Number.isFinite(v));

    // 2) Update x domain based on data values
    vis.xScale.domain(d3.extent(vis.values)).nice();

    // 3) Build bins (each bin has x0, x1, and an array of values)
    vis.binGenerator = d3.bin()
      .domain(vis.xScale.domain())
      .thresholds(vis.config.bins);

    vis.bins = vis.binGenerator(vis.values);

    // 4) Update y domain based on bin counts
    vis.yScale.domain([0, d3.max(vis.bins, b => b.length) || 0]).nice();

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // --- Bars (data join on bins) ---
    vis.bars = vis.barsG.selectAll("rect")
      .data(vis.bins);

    vis.bars.enter()
      .append("rect")
      .merge(vis.bars)
      .attr("x", d => vis.xScale(d.x0) + 1)
      .attr("y", d => vis.yScale(d.length))
      .attr("width", d => Math.max(0, vis.xScale(d.x1) - vis.xScale(d.x0) - 2))
      .attr("height", d => vis.height - vis.yScale(d.length))
      .attr("fill", "#4682B4");

    vis.bars.exit().remove();

    // --- Axes ---
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);
  }
}