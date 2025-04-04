import { useState, useEffect } from "react";

const useDurationChartData = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Duração Média (minutos)",
        color: "info",
        data: [],
      },
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const apiUrl = process.env.REACT_APP_API_URL;

        if (!token) {
          throw new Error("Nenhum token de autenticação encontrado");
        }

        const response = await fetch(`${apiUrl}/api/reveosDuration`, {
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

        // Ordenar dados por ano e mês
        const dadosOrdenados = data.sort((a, b) => {
          if (a.Ano !== b.Ano) return a.Ano - b.Ano;
          return a.Mes - b.Mes;
        });

        setChartData({
          labels: dadosOrdenados.map((item) => `${item.Mes}/${item.Ano}`),
          datasets: [
            {
              label: "Duração Média (minutos)",
              color: "info",
              data: dadosOrdenados.map((item) => item.AverageDuration),
            },
          ],
        });
      } catch (error) {
        console.error("Erro ao buscar dados:", error);

        setChartData({
          labels: ["Sem dados"],
          datasets: [
            {
              label: "Duração Média (minutos)",
              color: "info",
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

export default useDurationChartData;
