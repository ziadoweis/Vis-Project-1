class Histogram {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 560,
      containerHeight: _config.containerHeight || 240,
      margin: _config.margin || { top: 10, right: 18, bottom: 50, left: 60 },
      xLabel: _config.xLabel || "",
      yLabel: _config.yLabel || "Count",
      bins: _config.bins || 18,
      valueAccessor: _config.valueAccessor,
      onBrush: _config.onBrush || null
    };

    this.data = _data;

    // selectionSet is a Set(iso3) or null
    this.selectionSet = null;

    // global tooltip
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

    // base bars (all countries)
    vis.barsG = vis.chart.append("g").attr("class", "bars");

    // overlay bars (selected countries only)
    vis.selBarsG = vis.chart.append("g").attr("class", "bars-selected");

    // brush layer
    vis.brushG = vis.chart.append("g").attr("class", "brush");

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

    // init brush
    vis.brush = d3.brushX()
      .extent([[0, 0], [vis.width, vis.height]])
      .on("brush end", (event) => {
        if (!vis.config.onBrush) return;

        if (!event.selection) {
          vis.config.onBrush(null);
          return;
        }

        const [px0, px1] = event.selection;
        const x0 = vis.xScale.invert(px0);
        const x1 = vis.xScale.invert(px1);

        const min = Math.min(x0, x1);
        const max = Math.max(x0, x1);

        vis.config.onBrush([min, max]);
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
    this.renderVis(); // do NOT recompute scales; just re-style overlays
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

    // --- Base bars (all data) ---
    const base = vis.barsG.selectAll("rect")
      .data(vis.bins);

    base.enter()
      .append("rect")
      .merge(base)
      .attr("x", d => vis.xScale(d.x0) + 1)
      .attr("y", d => vis.yScale(d.length))
      .attr("width", d => Math.max(0, vis.xScale(d.x1) - vis.xScale(d.x0) - 2))
      .attr("height", d => vis.height - vis.yScale(d.length))
      .attr("rx", 4)
      .attr("fill", "rgba(147,197,253,0.70)")
      .attr("stroke", "rgba(0,0,0,0.08)")
      .attr("stroke-width", 1)
      .on("mouseenter", (event, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(`
            <div class="tt-title">Histogram bin</div>
            <div class="tt-row"><b>Range:</b> ${fmt(d.x0)} to ${fmt(d.x1)}</div>
            <div class="tt-row"><b>Countries:</b> ${fmtInt(d.length)}</div>
            <div class="tt-muted">Drag to brush (select a range)</div>
          `);
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", (event.clientX + 14) + "px")
          .style("top", (event.clientY + 14) + "px");
      })
      .on("mouseleave", () => vis.tooltip.style("opacity", 0));

    base.exit().remove();

    // --- Selected overlay bins (if selection exists) ---
    if (vis.selectionSet) {
      const selectedValues = vis.data
        .filter(d => vis.selectionSet.has(d.iso3))
        .map(vis.config.valueAccessor)
        .filter(v => Number.isFinite(v));

      const selBins = vis.binGenerator(selectedValues);

      const overlay = vis.selBarsG.selectAll("rect")
        .data(selBins);

      overlay.enter()
        .append("rect")
        .merge(overlay)
        .attr("x", d => vis.xScale(d.x0) + 1)
        .attr("y", d => vis.yScale(d.length))
        .attr("width", d => Math.max(0, vis.xScale(d.x1) - vis.xScale(d.x0) - 2))
        .attr("height", d => vis.height - vis.yScale(d.length))
        .attr("rx", 4)
        .attr("fill", "rgba(37,99,235,0.65)");

      overlay.exit().remove();

      // Fade base bars a bit for contrast
      vis.barsG.attr("opacity", 0.35);
    } else {
      vis.selBarsG.selectAll("rect").remove();
      vis.barsG.attr("opacity", 1);
    }

    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);

    vis.xLabel.text(vis.config.xLabel);
    vis.yLabel.text(vis.config.yLabel);
  }
}