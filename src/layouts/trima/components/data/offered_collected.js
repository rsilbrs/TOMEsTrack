import { useState, useEffect } from "react";

const useLineChartData = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Plaquetas Oferecidas",
        color: "warning",
        data: [],
      },
      {
        label: "Plaquetas Coletadas",
        color: "warning",
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

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/apheresisComponents`, {
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

        // Plaquetas Oferecidas
        const Offered = dadosOrdenados.map((item) => item.TotalOffered || 0);
        if (Offered.some((valor) => valor > 0)) {
          datasets.push({
            label: "Plaquetas Oferecidas",
            color: "warning",
            data: Offered,
          });
        }

        // Plaquetas Coletadas
        const Collected = dadosOrdenados.map((item) => item.TotalCollected || 0);
        if (Collected.some((valor) => valor > 0)) {
          datasets.push({
            label: "Plaquetas Coletadas",
            color: "warning",
            data: Collected,
            borderDash: [5, 5], // Linha tracejada para diferenciar
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
              label: "Plaquetas Oferecidas",
              color: "warning",
              data: [0],
            },
            {
              label: "Plaquetas Coletadas",
              color: "warning",
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
