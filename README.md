# People and Energy: How Does Energy Consumption Affect Our Lives?
**Author:** Ziad Oweis

---

## Motivation
Energy consumption plays a major role in shaping how people live, how healthy they are, and how societies develop. However, energy data is often presented in isolation, without clear connections to human outcomes such as life expectancy.

The goal of this project is to help a general audience explore how **energy use and emissions relate to quality of life across countries**. By combining multiple coordinated visualizations into a single dashboard, this application allows users to examine distributions, relationships, and geographic patterns simultaneously.

Rather than presenting a single static chart, this project emphasizes **interactive exploration**. Users can select indicators, brush subsets of countries, and immediately see how those countries appear across all views.

---

## Data
All data used in this project comes from **Our World in Data**:  https://ourworldindata.org

The datasets include country-level indicators such as:
- CO2 emissions per capita
- Life expectancy
- Energy use per person
- Fossil fuel consumption by type (oil, gas, coal)

The raw data was downloaded as CSV files and preprocessed using Python. During preprocessing:
- Column names were standardized (country name, ISO3 code, year).
- Data was filtered to a consistent year or year range.
- Multiple datasets were merged using ISO3 country codes.
- Invalid or mismatched year ranges were rejected to ensure consistency.

The final output is a single merged CSV file that is loaded directly by the web application.

---

## Visualization Components and Interaction

### Distribution Views (Histograms)
The dashboard includes two histograms:
- Histogram A shows the distribution of Variable A across countries.
- Histogram B shows the distribution of Variable B across countries.

Each bar represents the number of countries whose values fall within a specific range.

**Interactions:**
- Users can brush a range of values along the x-axis.
- The brushed range selects a subset of countries.
- Selected countries are highlighted across all other visualizations.

<img src=screenshots/Histograms.png>

---

### Relationship View (Scatterplot)
The scatterplot shows the relationship between Variable A (x-axis) and Variable B (y-axis). Each point represents a country.

**Interactions:**
- Users can brush a rectangular region to select a group of countries.
- Selected countries are emphasized, while non-selected countries are faded.
- Hovering over a point displays detailed information about the country.

<img src=screenshots/Scatterplot.png>

---

### Geographic Views (Choropleth Maps)
Two choropleth maps show how the selected indicators are distributed spatially across the world.

**Interactions:**
- Hovering over a country shows its name and value.
- Countries selected through brushing in other views remain highlighted.
- Countries without data are displayed in a neutral color.

<img src=screenshots/Maps.png>

---

### Coordinated Brushing and Linking
All visualizations in the dashboard are **linked**:
- Brushing in any histogram or the scatterplot updates every other view.
- Histograms show overlay bars for selected countries.
- Scatterplot points fade for non-selected countries.
- Maps fade non-selected countries.

This coordination allows users to track the same group of countries across distributions, relationships, and geographic patterns.

---

## Findings and Insights
This project originally began as an exploration of the relationship between **CO2 emissions per capita and life expectancy**. The initial question was simple: *Do countries that emit more CO2 per person tend to have higher life expectancy?*  

Early visualizations showed a general positive relationship — countries with higher CO2 emissions often had higher life expectancy — but also revealed significant variation. Some countries achieved high life expectancy with relatively low emissions, while others produced high emissions without comparable health outcomes. This raised an important follow-up question: **Is CO2 itself the driver, or is it a proxy for something broader?**

As the project evolved, this question motivated a shift toward a more comprehensive analysis of **energy consumption and human well-being**. By incorporating additional indicators such as **energy use per person** and **fossil fuel consumption by type**, the focus expanded from emissions alone to how energy access and usage relate to quality of life.

Using the interactive dashboard, several insights emerge:

- **Energy use per person shows a clearer and more consistent relationship with life expectancy** than CO2 emissions alone, suggesting that access to energy — not just emissions — plays a key role in health and development.
- Countries with low energy consumption generally cluster at lower life expectancy levels, while higher energy consumption is associated with improved outcomes, up to a point.
- The relationship is not linear: beyond a certain level of energy use, gains in life expectancy begin to plateau.
- Geographic patterns reveal regional differences, with high-energy, high-life-expectancy countries concentrated in North America and Europe, while lower-energy countries cluster in parts of Africa and South Asia.
- Brushing subsets of countries shows that some nations achieve relatively high life expectancy with moderate energy consumption, indicating that efficiency, healthcare systems, and social factors also matter.

Overall, the project demonstrates how an initial exploration of **CO2 emissions and life expectancy** naturally led to a broader investigation of **people, energy consumption, and well-being**. The coordinated visualizations make it possible to move beyond a single correlation and instead understand how multiple energy-related factors interact with human outcomes across the world.

<img src = "screenshots/Fullscreen Brushed.png">

---

## Process and Implementation
This project was built using:
- **Python (pandas)** for data preprocessing and merging
- **D3.js (v6)** for all visualizations
- **HTML and CSS** for layout and styling
- **GitHub** for version control
- **Vercel** for deployment

The JavaScript code is structured using reusable visualization classes:
- `Histogram.js`
- `Scatterplot.js`
- `ChoroplethMap.js`

A central `main.js` file loads the data, manages application state, and coordinates interactions between views.

**Source code:**  https://github.com/ziadoweis/Vis-Project-1/tree/main

**Live application:**  https://vis-project-1-six.vercel.app/

---

## Challenges and Future Work
One major challenge was implementing **coordinated brushing** across multiple views while keeping scales stable. This required careful separation of responsibilities between the visualization classes and the main controller logic.

Another challenge was designing a layout that fits all visualizations on a single screen without sacrificing readability.

Future improvements could include:
- Time-based interactions (year slider or animation)
- Grouping countries by region
- Improved accessibility (colorblind-safe palettes and keyboard interactions)

---

## Use of AI and Collaboration
AI tools were used as a learning aid during this project. Specifically, AI was used to:
- Help reason through D3 patterns and brushing logic
- Debug JavaScript and CSS layout issues
- Improve clarity in documentation (mainly for the markdown)

All code was written and integrated by me, and I ensured I understood each component before including it.

---

## Demo Video
[![ALT_TEXT](https://img.youtube.com/vi/764QlEmJfFs/0.jpg)](https://www.youtube.com/watch?v=764QlEmJfFs)

*Click on the thumbnail to go to the video.*