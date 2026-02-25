class Histogram {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 520,
      containerHeight: _config.containerHeight || 280,
      margin: _config.margin || { top: 10, right: 18, bottom: 50, left: 60 },
      xLabel: _config.xLabel || "",
      yLabel: _config.yLabel || "Count",
      bins: _config.bins || 25,
      valueAccessor: _config.valueAccessor
    };

    this.data = _data;

    // One shared tooltip for the whole page
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

    vis.xAxis = d3.axisBottom(vis.xScale).ticks(6);
    vis.yAxis = d3.axisLeft(vis.yScale).ticks(6).tickFormat(d3.format("d"));

    vis.xAxisG = vis.chart.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${vis.height})`);

    vis.yAxisG = vis.chart.append("g")
      .attr("class", "axis y-axis");

    vis.barsG = vis.chart.append("g")
      .attr("class", "bars");

    vis.xLabel = vis.chart.append("text")
      .attr("class", "label x-label")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + 42)
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

    vis.values = vis.data
      .map(vis.config.valueAccessor)
      .filter(v => Number.isFinite(v));

    if (vis.values.length === 0) {
      vis.bins = [];
      vis.xScale.domain([0, 1]);
      vis.yScale.domain([0, 1]);
      vis.renderVis();
      return;
    }

    vis.xScale.domain(d3.extent(vis.values)).nice();

    vis.binGenerator = d3.bin()
      .domain(vis.xScale.domain())
      .thresholds(vis.config.bins);

    vis.bins = vis.binGenerator(vis.values);
    vis.yScale.domain([0, d3.max(vis.bins, b => b.length) || 0]).nice();

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    const fmt = d3.format(",.2f");
    const fmtInt = d3.format(",");

    vis.bars = vis.barsG.selectAll("rect")
      .data(vis.bins);

    vis.bars.enter()
      .append("rect")
      .merge(vis.bars)
      .attr("x", d => vis.xScale(d.x0) + 1)
      .attr("y", d => vis.yScale(d.length))
      .attr("width", d => Math.max(0, vis.xScale(d.x1) - vis.xScale(d.x0) - 2))
      .attr("height", d => vis.height - vis.yScale(d.length))
      .attr("rx", 4)
      .attr("fill", "rgba(147,197,253,0.75)")
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-width", 1)
      .on("mouseenter", (event, d) => {
        d3.select(event.currentTarget)
          .attr("fill", "rgba(147,197,253,0.95)")
          .attr("stroke", "rgba(255,255,255,0.35)");

        vis.tooltip
          .style("opacity", 1)
          .html(`
            <div class="tt-title">Histogram bin</div>
            <div class="tt-row"><b>Range:</b> ${fmt(d.x0)} to ${fmt(d.x1)}</div>
            <div class="tt-row"><b>Countries:</b> ${fmtInt(d.length)}</div>
            <div class="tt-muted">Hover other bars for details</div>
          `);
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", (event.clientX + 14) + "px")
          .style("top", (event.clientY + 14) + "px");
      })
      .on("mouseleave", (event) => {
        d3.select(event.currentTarget)
          .attr("fill", "rgba(147,197,253,0.75)")
          .attr("stroke", "rgba(255,255,255,0.18)");

        vis.tooltip.style("opacity", 0);
      });

    vis.bars.exit().remove();

    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);

    vis.xLabel.text(vis.config.xLabel);
    vis.yLabel.text(vis.config.yLabel);
  }
}