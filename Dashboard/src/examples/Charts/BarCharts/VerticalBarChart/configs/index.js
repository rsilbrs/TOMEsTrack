/**
=========================================================
* Material Dashboard 2  React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// Material Dashboard 2 React base styles
import typography from "assets/theme/base/typography";

function configs(labels, datasets) {
  // Calcular o valor mínimo entre todos os datasets
  let minValue = Number.MAX_SAFE_INTEGER;
  let maxValue = 0;

  datasets.forEach((dataset) => {
    const datasetMin = Math.min(
      ...dataset.data.filter((value) => value !== null && value !== undefined)
    );
    const datasetMax = Math.max(
      ...dataset.data.filter((value) => value !== null && value !== undefined)
    );

    if (datasetMin < minValue) {
      minValue = datasetMin;
    }

    if (datasetMax > maxValue) {
      maxValue = datasetMax;
    }
  });

  // Ajustar o valor mínimo para -10% do valor mínimo encontrado
  // ou zero se o valor mínimo for zero
  const minScaleValue = minValue > 0 ? minValue * 0.9 : minValue * 1.1;

  return {
    data: {
      labels,
      datasets: [...datasets],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          grid: {
            drawBorder: false,
            display: true,
            drawOnChartArea: true,
            drawTicks: false,
            borderDash: [5, 5],
          },
          ticks: {
            display: true,
            padding: 10,
            color: "#9ca2b7",
            font: {
              size: 11,
              family: typography.fontFamily,
              style: "normal",
              lineHeight: 2,
            },
          },
          // Define a escala dinâmica para o eixo Y
          min: minScaleValue,
          max: maxValue,
        },
        x: {
          grid: {
            drawBorder: false,
            display: false,
            drawOnChartArea: true,
            drawTicks: true,
          },
          ticks: {
            display: true,
            color: "#9ca2b7",
            padding: 10,
            font: {
              size: 11,
              family: typography.fontFamily,
              style: "normal",
              lineHeight: 2,
            },
          },
        },
      },
    },
  };
}

export default configs;
