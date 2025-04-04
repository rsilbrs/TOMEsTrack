import { useState, useEffect } from "react";

// @mui material components
import Card from "@mui/material/Card";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Data
import DataTable from "examples/Tables/DataTable";

function Productivity() {
  const [produtividadeData, setProdutividadeData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Nenhum token de autenticação encontrado");
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/produtividadeUsuarios`, {
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

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        const dados = data.map((usuario) => ({
          name: `${usuario.FIRST_NAME} ${usuario.LAST_NAME}`,
          aferese: usuario.TotalAferese.toString(),
          st: usuario.TotalReveos,
        }));
        setProdutividadeData(dados);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setProdutividadeData([]);
      }
    };

    fetchData();
  }, []);

  return (
    <Card>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" p={3}>
        <MDBox>
          <MDTypography variant="h4">Produtividade por usuário</MDTypography>
        </MDBox>
      </MDBox>
      <MDBox>
        <DataTable
          showTotalEntries={true}
          canSearch={true}
          table={{
            columns: [
              { Header: "Nome", accessor: "name", width: "30%" },
              { Header: "Aférese", accessor: "aferese", width: "30%" },
              { Header: "Sangue Total", accessor: "st", width: "30%" },
            ],
            rows: produtividadeData,
          }}
        />
      </MDBox>
    </Card>
  );
}

export default Productivity;
