class ChoroplethMap {

  constructor(_config, _geoData, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 520,
      containerHeight: _config.containerHeight || 360,
      margin: _config.margin || { top: 10, right: 10, bottom: 10, left: 10 },

      // Join key and value accessor
      keyAccessor: _config.keyAccessor,       
      valueAccessor: _config.valueAccessor,  

      // Color interpolator (sequential)
      colorInterpolator: _config.colorInterpolator || d3.interpolateBlues,

      // Missing-data fill
      missingColor: _config.missingColor || "#eeeeee"
    };

    this.geoData = _geoData; // GeoJSON
    this.data = _data;

    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // SVG
    vis.svg = d3.select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    // Chart group
    vis.chart = vis.svg.append("g")
      .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Projection + path
    vis.projection = d3.geoNaturalEarth1();
    vis.path = d3.geoPath().projection(vis.projection);

    // Fit the world to the available space
    vis.projection.fitSize([vis.width, vis.height], vis.geoData);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    // Build a lookup: iso3 -> value
    vis.valueById = new Map(
      vis.data.map(d => [vis.config.keyAccessor(d), vis.config.valueAccessor(d)])
    );

    // Determine color domain from existing values
    const values = Array.from(vis.valueById.values()).filter(v => Number.isFinite(v));
    vis.colorDomain = d3.extent(values);

    // rebuild the scale each update so changes to colorInterpolator take effect
    vis.colorScale = d3.scaleSequential(vis.config.colorInterpolator)
      .domain(vis.colorDomain);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // Draw countries
    const countries = vis.chart.selectAll("path.country")
      .data(vis.geoData.features);

    countries.enter()
      .append("path")
      .attr("class", "country")
      .merge(countries)
      .attr("d", vis.path)
      .attr("stroke", "#999")
      .attr("stroke-width", 0.4)
      .attr("fill", d => {
        // holtzy world.geojson uses d.id as the join key (ISO3)
        const v = vis.valueById.get(d.id);
        return Number.isFinite(v) ? vis.colorScale(v) : vis.config.missingColor;
      });

    countries.exit().remove();
  }
}