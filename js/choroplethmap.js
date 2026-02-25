class ChoroplethMap {
  constructor(_config, _geoData, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 560,
      containerHeight: _config.containerHeight || 240,
      margin: _config.margin || { top: 6, right: 6, bottom: 6, left: 6 },

      keyAccessor: _config.keyAccessor,
      valueAccessor: _config.valueAccessor,

      colorInterpolator: _config.colorInterpolator || d3.interpolateBlues,
      missingColor: _config.missingColor || "rgba(0,0,0,0.06)"
    };

    this.geoData = _geoData;
    this.data = _data;

    this.selectionSet = null;
    this.tooltip = d3.select("#tooltip");

    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    vis.svg = d3.select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    vis.chart = vis.svg.append("g")
      .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.projection = d3.geoNaturalEarth1();
    vis.path = d3.geoPath().projection(vis.projection);

    vis.projection.fitSize([vis.width, vis.height], vis.geoData);

    vis.updateVis();
  }

  setSelection(selectionSet) {
    this.selectionSet = selectionSet;
    this.renderVis();
  }

  updateVis() {
    let vis = this;

    // iso3 -> value
    vis.valueById = new Map(
      vis.data.map(d => [vis.config.keyAccessor(d), vis.config.valueAccessor(d)])
    );

    const values = Array.from(vis.valueById.values()).filter(v => Number.isFinite(v));
    const domain = d3.extent(values);

    vis.colorScale = d3.scaleSequential(vis.config.colorInterpolator)
      .domain(domain);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    const fmt = d3.format(",.2f");

    const countries = vis.chart.selectAll("path.country")
      .data(vis.geoData.features);

    countries.enter()
      .append("path")
      .attr("class", "country")
      .merge(countries)
      .attr("d", vis.path)
      .attr("stroke", "rgba(0,0,0,0.15)")
      .attr("stroke-width", 0.6)
      .attr("fill", d => {
        const v = vis.valueById.get(d.id);
        return Number.isFinite(v) ? vis.colorScale(v) : vis.config.missingColor;
      })
      .attr("opacity", d => {
        if (!vis.selectionSet) return 1;
        return vis.selectionSet.has(d.id) ? 1 : 0.15;
      })
      .on("mouseenter", (event, d) => {
        d3.select(event.currentTarget)
          .attr("stroke-width", 1.2);

        const iso3 = d.id;
        const v = vis.valueById.get(iso3);

        const row = vis.data.find(r => r.iso3 === iso3);
        const name = row ? row.country : iso3;

        vis.tooltip
          .style("opacity", 1)
          .html(`
            <div class="tt-title">${name}</div>
            <div class="tt-row"><b>Value:</b> ${Number.isFinite(v) ? fmt(v) : "No data"}</div>
            <div class="tt-muted">ISO3: ${iso3}</div>
          `);
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", (event.clientX + 14) + "px")
          .style("top", (event.clientY + 14) + "px");
      })
      .on("mouseleave", (event) => {
        d3.select(event.currentTarget)
          .attr("stroke-width", 0.6);
        vis.tooltip.style("opacity", 0);
      });

    countries.exit().remove();
  }
}