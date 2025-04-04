import { useState, useEffect } from "react";

const useAlarmFrequencyData = (days = 60) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Percentual",
        color: "error",
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

        const response = await fetch(`${apiUrl}/api/reveosAlarms?days=${days}`, {
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

        // Formatar os labels para mostrar apenas o nome do alarme (remove o código e o ID)
        const formatLabel = (message) => {
          // Remove o código do início (assume que o código é seguido por um espaço) e remove o ID do final
          const alarmName = message.split(" ").slice(1).join(" ");
          // Trunca a mensagem se for muito longa
          return `${alarmName}`;
        };

        setChartData({
          labels: data.map((item) => formatLabel(item.Message)),
          datasets: [
            {
              label: "Frequência de Alarmes (%)",
              color: "error",
              data: data.map((item) => item.Percentual),
              // Adiciona o símbolo % após cada valor no tooltip
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return `${context.parsed.y}%`;
                  },
                },
              },
            },
          ],
        });
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setChartData({
          labels: ["Sem dados"],
          datasets: [
            {
              label: "Frequência de Alarmes (%)",
              color: "error",
              data: [0],
            },
          ],
        });
      }
    };

    fetchData();
  }, [days]);

  return chartData;
};

export default useAlarmFrequencyData;
