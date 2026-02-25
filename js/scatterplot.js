class Scatterplot {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1140,
      containerHeight: _config.containerHeight || 280,
      margin: _config.margin || { top: 10, right: 18, bottom: 55, left: 70 },
      xLabel: _config.xLabel || "",
      yLabel: _config.yLabel || "",
      xAccessor: _config.xAccessor,
      yAccessor: _config.yAccessor,
      onBrush: _config.onBrush || null
    };

    this.data = _data;
    this.selectionSet = null;

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

    vis.pointsG = vis.chart.append("g").attr("class", "points");

    // brush layer
    vis.brushG = vis.chart.append("g").attr("class", "brush");

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

    // init brush
    vis.brush = d3.brush()
      .extent([[0, 0], [vis.width, vis.height]])
      .on("brush end", (event) => {
        if (!vis.config.onBrush) return;

        if (!event.selection) {
          vis.config.onBrush(null);
          return;
        }

        const [[x0, y0], [x1, y1]] = event.selection;

        const xmin = vis.xScale.invert(Math.min(x0, x1));
        const xmax = vis.xScale.invert(Math.max(x0, x1));
        const ymin = vis.yScale.invert(Math.max(y0, y1)); // y invert!
        const ymax = vis.yScale.invert(Math.min(y0, y1));

        vis.config.onBrush({ x: [xmin, xmax], y: [ymin, ymax] });
      });

    vis.brushG.call(vis.brush);

    vis.updateVis();
  }

  clearBrush() {
    let vis = this;
    vis.brushG.call(vis.brush.move, null);
  }

  setSelection(selectionSet) {
    this.selectionSet = selectionSet;
    this.renderVis();
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

    // Scales fixed to full-data extents (NOT selection)
    vis.xScale.domain(d3.extent(vis.filteredData, vis.config.xAccessor)).nice();
    vis.yScale.domain(d3.extent(vis.filteredData, vis.config.yAccessor)).nice();

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    const fmt = d3.format(",.2f");

    const points = vis.pointsG.selectAll("circle")
      .data(vis.filteredData, d => d.iso3);

    points.enter()
      .append("circle")
      .attr("r", 3.2)
      .attr("fill", "rgba(16,185,129,0.75)")
      .attr("stroke", "rgba(0,0,0,0.10)")
      .attr("stroke-width", 1)
      .merge(points)
      .attr("cx", d => vis.xScale(vis.config.xAccessor(d)))
      .attr("cy", d => vis.yScale(vis.config.yAccessor(d)))
      .attr("opacity", d => {
        if (!vis.selectionSet) return 0.85;
        return vis.selectionSet.has(d.iso3) ? 0.95 : 0.05; // practically "only selected"
      })
      .attr("r", d => {
        if (!vis.selectionSet) return 3.2;
        return vis.selectionSet.has(d.iso3) ? 4.2 : 2.5;
      })
      .on("mouseenter", (event, d) => {
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
      .on("mouseleave", () => vis.tooltip.style("opacity", 0));

    points.exit().remove();

    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);

    vis.xLabel.text(vis.config.xLabel);
    vis.yLabel.text(vis.config.yLabel);
  }
}