// @mui material components
import Card from "@mui/material/Card";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React example components
import TimelineItem from "examples/Timeline/TimelineItem";
import React, { useState, useEffect } from "react";

function LoadingComponent() {
  return (
    <Card sx={{ height: "100%" }}>
      <MDBox pt={3} px={3}>
        <MDTypography variant="h6" fontWeight="medium">
          Últimas unidades processadas
        </MDTypography>
        <MDTypography variant="button" color="text">
          Carregando...
        </MDTypography>
      </MDBox>
    </Card>
  );
}

function Production() {
  const [doacoes, setDoacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Nenhum token de autenticação encontrado");
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ultimasDoacoes`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data = await response.json();
        setDoacoes(data);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox pt={3} px={3}>
        <MDTypography variant="h6" fontWeight="medium">
          Últimas unidades processadas
        </MDTypography>
      </MDBox>
      <MDBox p={2}>
        {doacoes.length === 0 ? (
          <MDTypography variant="button" color="text">
            Nenhuma doação encontrada
          </MDTypography>
        ) : (
          doacoes.map((doacao, index) => (
            <TimelineItem
              key={doacao.DonationId || index}
              color={doacao.TipoDoacao === "Aférese" ? "warning" : "error"}
              icon="bloodtype"
              title={doacao.DonationId}
              lastItem={index === doacoes.length - 1}
              dateTime={`${doacao.TipoDoacao} - ${new Date(doacao.DataDoacao).toLocaleString(
                "pt-BR",
                {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}`}
            />
          ))
        )}
      </MDBox>
    </Card>
  );
}

export default Production;
