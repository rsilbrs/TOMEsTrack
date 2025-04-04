import React, { useState, useEffect } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function UncollectedComponents() {
  const [data, setData] = useState({
    totalOffered: 0,
    totalCollected: 0,
    totalUncollected: 0,
    percentage: 0,
  });
  const [period, setPeriod] = useState(30);

  // Função para formatar números com separador de milhares
  const formatNumber = (number) => {
    return number.toLocaleString("pt-BR");
  };

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
            localStorage.removeItem("authToken");
            window.location.href = "/authentication/sign-in";
            return;
          }
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const dados = await response.json();

        // Ordenar dados por ano e mês
        const dadosOrdenados = dados.sort((a, b) => {
          if (a.Ano !== b.Ano) return a.Ano - b.Ano;
          return a.Mes - b.Mes;
        });

        // Filtrar dados pelo período selecionado
        const dataAtual = new Date();
        const dataInicial = new Date();
        dataInicial.setDate(dataAtual.getDate() - period);

        const dadosFiltrados = dadosOrdenados.filter((item) => {
          const dataItem = new Date(item.Ano, item.Mes - 1, 1);
          return dataItem >= dataInicial && dataItem <= dataAtual;
        });

        // Calcular totais
        const totalOffered = dadosFiltrados.reduce(
          (acc, item) => acc + (item.TotalOffered || 0),
          0
        );
        const totalCollected = dadosFiltrados.reduce(
          (acc, item) => acc + (item.TotalCollected || 0),
          0
        );
        const totalUncollected = totalOffered - totalCollected;
        const percentage = totalOffered > 0 ? (totalUncollected / totalOffered) * 100 : 0;

        setData({
          totalOffered,
          totalCollected,
          totalUncollected,
          percentage: Math.round(percentage),
        });
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };

    fetchData();
  }, [period]);

  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={3}>
        <MDBox
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          gap={2}
        >
          <MDBox lineHeight={1}>
            <MDTypography variant="h6" fontWeight="medium">
              Análise de componentes oferecidos e coletados
            </MDTypography>
          </MDBox>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                px: 1.5,
                py: 0.5,
                fontSize: "0.875rem",
                fontWeight: "medium",
                textTransform: "none",
              },
            }}
          >
            <ToggleButton value={30}>30 Dias</ToggleButton>
            <ToggleButton value={60}>60 Dias</ToggleButton>
            <ToggleButton value={90}>90 Dias</ToggleButton>
          </ToggleButtonGroup>
        </MDBox>

        <Divider sx={{ my: 2 }} />

        <MDBox display="flex" flexDirection="column" gap={2}>
          {/* Primeira linha: Total e Coletados */}
          <MDBox display="flex" gap={3}>
            {/* Total de Componentes */}
            <MDBox flex={1}>
              <MDTypography variant="button" color="text" fontWeight="medium">
                Oferecidos
              </MDTypography>
              <MDTypography variant="h4" fontWeight="bold" color="info">
                {formatNumber(data.totalOffered)}
              </MDTypography>
            </MDBox>

            {/* Componentes Coletados */}
            <MDBox flex={1}>
              <MDTypography variant="button" color="text" fontWeight="medium">
                Coletados
              </MDTypography>
              <MDTypography variant="h4" fontWeight="bold" color="success">
                {formatNumber(data.totalCollected)}
              </MDTypography>
            </MDBox>
          </MDBox>

          {/* Segunda linha: Não Coletados */}
          <MDBox>
            <MDTypography variant="button" color="text" fontWeight="medium">
              Componentes Oferecidos mas Não Coletados
            </MDTypography>
            <MDBox display="flex" alignItems="baseline" gap={1}>
              <MDTypography variant="h3" fontWeight="bold" color="error">
                {formatNumber(data.totalUncollected)}
              </MDTypography>
              <MDTypography variant="button" color="error">
                ({data.percentage}% do oferecido)
              </MDTypography>
            </MDBox>
          </MDBox>
        </MDBox>

        {/* Barra de Progresso Visual */}
        <MDBox mt={3}>
          <MDBox
            sx={{
              height: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <MDBox
              sx={{
                height: "100%",
                display: "flex",
                transition: "width 0.3s ease-in-out",
              }}
            >
              <MDBox
                sx={{
                  width: `${(data.totalCollected / data.totalOffered) * 100}%`,
                  backgroundColor: "success.main",
                }}
              />
              <MDBox
                sx={{
                  width: `${(data.totalUncollected / data.totalOffered) * 100}%`,
                  backgroundColor: "error.main",
                }}
              />
            </MDBox>
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default UncollectedComponents;
