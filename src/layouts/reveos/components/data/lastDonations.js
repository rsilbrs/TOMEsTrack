import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Data
import DataTable from "examples/Tables/DataTable";

// Componente para célula personalizada
const CustomCell = ({ value }) => (
  <MDTypography
    component="a"
    href="#"
    variant="caption"
    color="text"
    fontWeight="medium"
    sx={{ cursor: "default" }}
  >
    {value.text}
  </MDTypography>
);

// Componente para o ícone de relatório
const ReportIcon = ({ procedureId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/report/reveos/${procedureId}`);
  };

  return (
    <MDBox
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={handleClick}
      sx={{
        cursor: "pointer",
        "&:hover": {
          "& .report-icon": {
            transform: "scale(1.1)",
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
        },
      }}
    >
      <Icon
        className="report-icon"
        sx={{
          fontSize: "20px !important",
          color: "info.main",
          padding: "8px",
          borderRadius: "8px",
          transition: "all 0.2s ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        description
      </Icon>
    </MDBox>
  );
};

// Definindo PropTypes para os componentes
CustomCell.propTypes = {
  value: PropTypes.shape({
    text: PropTypes.string.isRequired,
  }).isRequired,
};

ReportIcon.propTypes = {
  procedureId: PropTypes.string.isRequired,
};

function LastDonations() {
  const [doacoesData, setDoacoesData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Nenhum token de autenticação encontrado");
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reveosProcedures`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        // Adicione este log para verificar a estrutura dos dados
        console.log("Dados recebidos da API:", data[0]);

        const dados = data.map((doacao) => {
          const dataProcedimento = new Date(doacao.CreateDate);
          const dataFormatada = `${String(dataProcedimento.getDate()).padStart(2, "0")}/${String(
            dataProcedimento.getMonth() + 1
          ).padStart(2, "0")}/${dataProcedimento.getFullYear().toString().slice(-2)}`;
          const horaFormatada = `${String(dataProcedimento.getHours()).padStart(2, "0")}:${String(
            dataProcedimento.getMinutes()
          ).padStart(2, "0")}`;

          // Aqui vamos usar o ID correto do procedimento
          return {
            codigo: doacao.UnitNumber,
            data: dataFormatada,
            hora: horaFormatada,
            relatorio: doacao.ProcedureId || doacao.Id, // Ajuste o nome do campo conforme sua API
          };
        });

        // Log para verificar os dados mapeados
        console.log("Dados mapeados:", dados[0]);

        setDoacoesData(dados);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };

    fetchData();
  }, []);

  const columns = [
    {
      Header: "Código doação",
      accessor: "codigo",
      width: "35%",
      Cell: (cellProps) => <CustomCell value={{ text: cellProps.value }} />,
    },
    {
      Header: "Data",
      accessor: "data",
      width: "25%",
      Cell: (cellProps) => <CustomCell value={{ text: cellProps.value }} />,
    },
    {
      Header: "Hora Inicio",
      accessor: "hora",
      width: "25%",
      Cell: (cellProps) => <CustomCell value={{ text: cellProps.value }} />,
    },
    {
      Header: "Relatório",
      accessor: "relatorio",
      width: "15%",
      Cell: (cellProps) => <ReportIcon procedureId={cellProps.value} />,
    },
  ];

  return (
    <Card>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" p={3}>
        <MDBox>
          <MDTypography variant="h4">Últimas Bolsas</MDTypography>
        </MDBox>
      </MDBox>
      <MDBox>
        {doacoesData && doacoesData.length > 0 ? (
          <DataTable
            entriesPerPage={{ defaultValue: 20 }}
            showTotalEntries={false}
            canSearch={true}
            isSorted={false}
            table={{
              columns: columns,
              rows: doacoesData,
            }}
          />
        ) : (
          <MDTypography>Nenhuma doação encontrada</MDTypography>
        )}
      </MDBox>
    </Card>
  );
}

export default LastDonations;
