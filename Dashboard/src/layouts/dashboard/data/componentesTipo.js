import { useState, useEffect } from "react";

const useLineChartData = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Plaquetas",
        color: "warning",
        data: [],
      },
      {
        label: "Hemácias",
        color: "error",
        data: [],
      },
      {
        label: "Plasma",
        color: "secondary",
        data: [],
      },
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Nenhum token de autenticação encontrado");
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/componentesTipo`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("authToken"); // Remove token inválido
            window.location.href = "/authentication/sign-in"; // Redireciona para login
            return;
          }
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        const dados = await response.json();

        // Ordenar dados por ano e mês
        const dadosOrdenados = dados.sort((a, b) => {
          if (a.Ano !== b.Ano) return a.Ano - b.Ano;
          return a.Mes - b.Mes;
        });

        // Criar datasets apenas para componentes com valores
        const datasets = [];

        // Plaquetas Aférese
        const plaquetasAferese = dadosOrdenados.map((item) => item.TotalPlaquetasAferese || 0);
        if (plaquetasAferese.some((valor) => valor > 0)) {
          datasets.push({
            label: "Plaquetas Aférese",
            color: "warning",
            data: plaquetasAferese,
          });
        }

        // Plaquetas ST
        const plaquetasST = dadosOrdenados.map((item) => item.TotalPlaquetasST || 0);
        if (plaquetasST.some((valor) => valor > 0)) {
          datasets.push({
            label: "Plaquetas ST",
            color: "warning",
            data: plaquetasST,
            borderDash: [5, 5], // Linha tracejada para diferenciar
          });
        }

        // Hemácias Aférese
        const hemaciasAferese = dadosOrdenados.map((item) => item.TotalHemaciasAferese || 0);
        if (hemaciasAferese.some((valor) => valor > 0)) {
          datasets.push({
            label: "Hemácias Aférese",
            color: "error",
            data: hemaciasAferese,
          });
        }

        // Hemácias ST
        const hemaciasST = dadosOrdenados.map((item) => item.TotalHemaciasST || 0);
        if (hemaciasST.some((valor) => valor > 0)) {
          datasets.push({
            label: "Hemácias ST",
            color: "error",
            data: hemaciasST,
            borderDash: [5, 5],
          });
        }

        // Plasma Aférese
        const plasmaAferese = dadosOrdenados.map((item) => item.TotalPlasmaAferese || 0);
        if (plasmaAferese.some((valor) => valor > 0)) {
          datasets.push({
            label: "Plasma Aférese",
            color: "success",
            data: plasmaAferese,
          });
        }

        // Plasma ST
        const plasmaST = dadosOrdenados.map((item) => item.TotalPlasmaST || 0);
        if (plasmaST.some((valor) => valor > 0)) {
          datasets.push({
            label: "Plasma ST",
            color: "success",
            data: plasmaST,
            borderDash: [5, 5],
          });
        }

        setChartData({
          labels: dadosOrdenados.map((item) => `${item.Mes}/${item.Ano}`),
          datasets: datasets,
        });
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        // Dados de fallback em caso de erro
        setChartData({
          labels: ["Sem dados"],
          datasets: [
            {
              label: "Plaquetas",
              color: "warning",
              data: [0],
            },
            {
              label: "Hemácias",
              color: "error",
              data: [0],
            },
            {
              label: "Plasma",
              color: "secondary",
              data: [0],
            },
          ],
        });
      }
    };

    fetchData();
  }, []);

  return chartData;
};

export default useLineChartData;
