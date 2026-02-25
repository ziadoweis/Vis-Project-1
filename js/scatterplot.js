class Scatterplot {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1100,
      containerHeight: _config.containerHeight || 420,
      margin: _config.margin || { top: 10, right: 18, bottom: 55, left: 70 },
      xLabel: _config.xLabel || "",
      yLabel: _config.yLabel || "",
      xAccessor: _config.xAccessor,
      yAccessor: _config.yAccessor
    };

    this.data = _data;
    this.tooltip = d3.select("#tooltip");

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

    vis.pointsG = vis.chart.append("g")
      .attr("class", "points");

    vis.xLabel = vis.chart.append("text")
      .attr("class", "label x-label")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 44)
      .attr("text-anchor", "middle")
      .text(vis.config.xLabel);

    vis.yLabel = vis.chart.append("text")
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

    vis.filteredData = vis.data.filter(d =>
      Number.isFinite(vis.config.xAccessor(d)) &&
      Number.isFinite(vis.config.yAccessor(d))
    );

    if (vis.filteredData.length === 0) {
      vis.xScale.domain([0, 1]);
      vis.yScale.domain([0, 1]);
      vis.renderVis();
      return;
    }

    vis.xScale.domain(d3.extent(vis.filteredData, vis.config.xAccessor)).nice();
    vis.yScale.domain(d3.extent(vis.filteredData, vis.config.yAccessor)).nice();

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    const fmt = d3.format(",.2f");

    vis.points = vis.pointsG.selectAll("circle")
      .data(vis.filteredData, d => d.iso3);

    vis.points.enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", "rgba(52,211,153,0.72)")
      .attr("stroke", "rgba(255,255,255,0.22)")
      .attr("stroke-width", 1)
      .merge(vis.points)
      .attr("cx", d => vis.xScale(vis.config.xAccessor(d)))
      .attr("cy", d => vis.yScale(vis.config.yAccessor(d)))
      .on("mouseenter", (event, d) => {
        d3.select(event.currentTarget)
          .attr("r", 5)
          .attr("fill", "rgba(52,211,153,0.95)")
          .attr("stroke", "rgba(255,255,255,0.45)");

        vis.tooltip
          .style("opacity", 1)
          .html(`
            <div class="tt-title">${d.country}</div>
            <div class="tt-row"><b>X:</b> ${fmt(vis.config.xAccessor(d))}</div>
            <div class="tt-row"><b>Y:</b> ${fmt(vis.config.yAccessor(d))}</div>
            <div class="tt-muted">ISO3: ${d.iso3} • Year: ${d.year}</div>
          `);
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", (event.clientX + 14) + "px")
          .style("top", (event.clientY + 14) + "px");
      })
      .on("mouseleave", (event) => {
        d3.select(event.currentTarget)
          .attr("r", 3)
          .attr("fill", "rgba(52,211,153,0.72)")
          .attr("stroke", "rgba(255,255,255,0.22)");

        vis.tooltip.style("opacity", 0);
      });

    vis.points.exit().remove();

    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);

    vis.xLabel.text(vis.config.xLabel);
    vis.yLabel.text(vis.config.yLabel);
  }
}