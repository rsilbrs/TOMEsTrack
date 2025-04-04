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

        const response = await fetch(`${apiUrl}/api/alarmsFrequency?days=${days}`, {
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

        // Formatar os labels para mostrar apenas o nome do alarme
        const formatLabel = (alarmName) => {
          return alarmName.length > 30 ? `${alarmName.substring(0, 30)}...` : alarmName;
        };

        setChartData({
          labels: data.map((item) => formatLabel(item.AlarmName)),
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
