/*
Funciona para
<ReportsLineChart
    color="info"
    title="Total Componentes Produzidos"
    date="Test"
    chart={componentes}
/>
*/

import { useState, useEffect } from "react";

const useBarChartData = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: {
      label: "Procedimentos Mensais",
      data: [],
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${process.env.API_URL}/api/aferese`);

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        const rawData = await response.json();

        // Função auxiliar para formatar o nome do mês
        const formatarMes = (mes) => {
          const meses = [
            "Jan",
            "Fev",
            "Mar",
            "Abr",
            "Mai",
            "Jun",
            "Jul",
            "Ago",
            "Set",
            "Out",
            "Nov",
            "Dez",
          ];
          return meses[mes - 1];
        };

        const processedData = rawData
          .sort((a, b) => {
            // Ordenar por ano e mês
            if (a.Ano !== b.Ano) return a.Ano - b.Ano;
            return a.Mes - b.Mes;
          })
          .map((item) => ({
            label: `${formatarMes(item.Mes)}/${String(item.Ano).slice(2)}`,
            valor: item.TotalProcedimentos,
          }));

        setChartData({
          labels: processedData.map((item) => item.label),
          datasets: {
            label: "Procedimentos",
            data: processedData.map((item) => item.valor),
          },
        });
      } catch (error) {
        console.error("Erro:", error);
        setChartData({
          labels: ["Jan-24", "Fev-24", "Mar-24"],
          datasets: {
            label: "Dados temporários",
            data: [1, 2, 3],
          },
        });
      }
    };

    fetchData();
  }, []);

  return chartData;
};

export default useBarChartData;
