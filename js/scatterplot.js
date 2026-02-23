class Scatterplot {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1100,
      containerHeight: _config.containerHeight || 420,
      margin: _config.margin || { top: 10, right: 18, bottom: 60, left: 70 },
      xLabel: _config.xLabel || "",
      yLabel: _config.yLabel || "",
      xAccessor: _config.xAccessor,  // e.g., d => d.co2
      yAccessor: _config.yAccessor   // e.g., d => d.life
    };

    this.data = _data;

    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    vis.xScale = d3.scaleLinear().range([0, vis.width]);
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    vis.svg = d3.select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    vis.chart = vis.svg.append("g")
      .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.xAxis = d3.axisBottom(vis.xScale).ticks(8);
    vis.yAxis = d3.axisLeft(vis.yScale).ticks(7);

    vis.xAxisG = vis.chart.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${vis.height})`);

    vis.yAxisG = vis.chart.append("g")
      .attr("class", "axis y-axis");

    // Group for points
    vis.pointsG = vis.chart.append("g")
      .attr("class", "points");

    // Labels
    vis.chart.append("text")
      .attr("class", "label x-label")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 48)
      .attr("text-anchor", "middle")
      .text(vis.config.xLabel);

    vis.chart.append("text")
      .attr("class", "label y-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -vis.height / 2)
      .attr("y", -54)
      .attr("text-anchor", "middle")
      .text(vis.config.yLabel);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    // Filter out invalid points
    vis.filteredData = vis.data.filter(d =>
      Number.isFinite(vis.config.xAccessor(d)) &&
      Number.isFinite(vis.config.yAccessor(d))
    );

    // Update domains
    vis.xScale.domain(d3.extent(vis.filteredData, vis.config.xAccessor)).nice();
    vis.yScale.domain(d3.extent(vis.filteredData, vis.config.yAccessor)).nice();

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // Points data join
    vis.points = vis.pointsG.selectAll("circle")
      .data(vis.filteredData);

    vis.points.enter()
      .append("circle")
      .merge(vis.points)
      .attr("cx", d => vis.xScale(vis.config.xAccessor(d)))
      .attr("cy", d => vis.yScale(vis.config.yAccessor(d)))
      .attr("r", 2.6)
      .attr("fill", "#4682B4")
      .attr("stroke", "black")
      .attr("stroke-opacity", 0.5)
      .attr("fill-opacity", 0.75);

    vis.points.exit().remove();

    // Axes
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);
  }
}