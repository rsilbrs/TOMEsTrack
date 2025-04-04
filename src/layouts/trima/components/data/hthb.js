import { useState, useEffect } from "react";

const useBarChartData = () => {
  const measureType = "hematocrit"; // [hematocrit/hemoglobin]

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: measureType === "hematocrit" ? "Média Ht (%)" : "Média Hb (g/dL)",
        color: "error",
        data: [],
      },
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const apiUrl = process.env.REACT_APP_API_URL; // Fallback URL

        if (!token) {
          throw new Error("Nenhum token de autenticação encontrado");
        }

        const response = await fetch(`${apiUrl}/api/donorInfo`, {
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
              label: measureType === "hematocrit" ? "Média Ht (%)" : "Média Hb (g/dL)",
              color: "error",
              data: dadosOrdenados.map((item) =>
                measureType === "hematocrit" ? item.MediaHematocrit : item.MediaHemoglobin
              ),
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
              label: measureType === "hematocrit" ? "Média Ht (%)" : "Média Hb (g/dL)",
              color: "error",
              data: [0],
            },
          ],
        });
      }
    };

    fetchData();
  }, [measureType]);

  return chartData;
};

export default useBarChartData;
