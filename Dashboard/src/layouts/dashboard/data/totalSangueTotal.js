import { useState, useEffect } from "react";

const useBarChartData = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Total de Procedimentos",
        color: "info",
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

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/sangueTotal`, {
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

        setChartData({
          labels: dadosOrdenados.map((item) => `${item.Mes}/${item.Ano}`),
          datasets: [
            {
              label: "Total de Doacões",
              color: "info",
              data: dadosOrdenados.map((item) => item.TotalDoacoes),
            },
          ],
        });
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        // Dados de fallback em caso de erro
        setChartData({
          labels: ["Sem dados"],
          datasets: [
            {
              label: "Total de Doacões",
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

export default useBarChartData;
