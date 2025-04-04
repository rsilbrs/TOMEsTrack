import React, { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import TimelineItem from "examples/Timeline/TimelineItem";

function OrdersOverview() {
  const [doacoes, setDoacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const API_KEY = "Terum0TOMEs2011!";
        const response = await fetch("http://localhost:8001/api/ultimasDoacoes", {
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("Dados recebidos da API:", data); // Debug

        // Verifica se data é um array
        if (!Array.isArray(data)) {
          console.error("Dados recebidos não são um array:", data);
          setDoacoes([]);
          setError("Formato de dados inválido");
          return;
        }

        // Verifica se há dados
        if (data.length === 0) {
          console.log("Nenhuma doação encontrada");
          setDoacoes([]);
          return;
        }

        setDoacoes(data);
      } catch (error) {
        console.error("Erro ao buscar doações:", error);
        setError(error.message);
        setDoacoes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
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

  if (error) {
    return (
      <Card sx={{ height: "100%" }}>
        <MDBox pt={3} px={3}>
          <MDTypography variant="h6" fontWeight="medium">
            Últimas unidades processadas
          </MDTypography>
          <MDTypography variant="button" color="error">
            Erro: {error}
          </MDTypography>
        </MDBox>
      </Card>
    );
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

export default OrdersOverview;
