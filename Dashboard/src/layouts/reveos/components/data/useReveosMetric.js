import { useState, useEffect } from "react";

const METRIC_CONFIGS = {
  plateletVolume: {
    label: "Volume Médio de Plaquetas",
    dataKey: "PlateletVolume",
    color: "warning",
    unit: "mL",
    endpoint: "reveosComponentsVolume",
  },
  plasmaVolume: {
    label: "Volume Médio de Plasma",
    dataKey: "PlasmaVolume",
    color: "success",
    unit: "mL",
    endpoint: "reveosComponentsVolume",
  },
  leukocyteVolume: {
    label: "Volume de Leucócitos",
    dataKey: "LeucocyteVolume",
    color: "secondary",
    unit: "mL",
    endpoint: "reveosComponentsVolume",
  },
  plateletIndex: {
    label: "Índice Plaquetário",
    dataKey: "PlateletIndex",
    color: "warning",
    unit: "",
    endpoint: "reveosComponentsVolume",
  },
  totalPlasmaVolume: {
    label: "Volume Total de Plasma",
    dataKey: "TotalPlasmaVolume",
    color: "success",
    unit: "L",
    endpoint: "reveosTotalPlasmaVolume",
    conversion: (value) => value / 1000,
  },
};

const useReveosMetric = (metricType) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: METRIC_CONFIGS[metricType]?.label || "Métrica",
        color: METRIC_CONFIGS[metricType]?.color || "info",
        data: [],
      },
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const apiUrl = process.env.REACT_APP_API_URL;
        const config = METRIC_CONFIGS[metricType];

        if (!token) {
          throw new Error("Nenhum token de autenticação encontrado");
        }

        if (!config) {
          throw new Error(`Tipo de métrica inválido: ${metricType}`);
        }

        const endpoint = config.endpoint || "reveosComponentsVolume";

        const response = await fetch(`${apiUrl}/api/${endpoint}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("authToken");
            window.location.href = "/authentication/sign-in";
            return;
          }
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        const dadosOrdenados = data.sort((a, b) => {
          if (a.Ano !== b.Ano) return a.Ano - b.Ano;
          return a.Mes - b.Mes;
        });

        const processData = (item) => {
          const value = item[config.dataKey];
          if (config.conversion && typeof value === "number") {
            return parseFloat(config.conversion(value).toFixed(2));
          }
          return value;
        };

        setChartData({
          labels: dadosOrdenados.map((item) => `${item.Mes}/${item.Ano}`),
          datasets: [
            {
              label: `${config.label} (${config.unit})`.trim(),
              color: config.color,
              data: dadosOrdenados.map(processData),
            },
          ],
        });
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setChartData({
          labels: ["Sem dados"],
          datasets: [
            {
              label: METRIC_CONFIGS[metricType]?.label || "Métrica",
              color: METRIC_CONFIGS[metricType]?.color || "info",
              data: [0],
            },
          ],
        });
      }
    };

    fetchData();
  }, [metricType]);

  return chartData;
};

export default useReveosMetric;
