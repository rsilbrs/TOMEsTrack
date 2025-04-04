import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";
import {
  Card,
  Grid,
  Divider,
  Container,
  Box,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import Icon from "@mui/material/Icon";

// Components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import ReveosIcon from "components/CustomIcons/Reveos";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Estilos para impressão
const printStyles = `
  @media print {
    @page {
      size: auto;
      margin: 15px;
    }

    body * {
      visibility: hidden;
      margin-top: -12px;
    }

    #report-content, #report-content * {
      visibility: visible;
    }

    #report-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 95%;
      padding: 20px;
      margin: 0 auto;
    }

    .MuiContainer-root {
      max-width: 100% !important;
      padding: 0 !important;
    }

    .no-print {
      display: none !important;
    }

    #report-content .MuiTypography-body2 {
      font-size: 12px !important;
    }

    .procedure-selections {
      font-size: 8px !important;
    }

    .procedure-selections .MuiGrid-container {
      margin: 0 !important;
    }

    .procedure-selections .MuiGrid-item {
      padding: 2px !important;
    }

    .procedure-selections .MuiTypography-root {
      font-size: 8px !important;
      white-space: nowrap !important;
      line-height: 1 !important;
    }
  }
`;

const ReportSection = ({ title, children }) => (
  <Box mb={3}>
    <MDTypography variant="h6" fontWeight="medium" mb={1}>
      {title}
    </MDTypography>
    <Box ml={2}>{children}</Box>
  </Box>
);

ReportSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const ReportField = ({ label, value }) => (
  <Grid item xs={6} sm={4} md={3}>
    <Box display="flex" flexDirection="column" mb={2}>
      <MDTypography variant="caption" color="text" fontWeight="bold">
        {label}
      </MDTypography>
      <MDTypography variant="body2">{value || "---"}</MDTypography>
    </Box>
  </Grid>
);

ReportField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
};

ReportField.defaultProps = {
  value: "---",
};

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return "---";

  const date = new Date(dateTimeString);

  const formattedDate = date.toISOString().split("T")[0].split("-").reverse().join("/");
  const formattedTime = dateTimeString.split("T")[1].substring(0, 5);

  return { date: formattedDate, time: formattedTime };
}

function ReveosReport() {
  const { codigo } = useParams();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = printStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");

        const reportResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/api/reveosReport/${codigo}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!reportResponse.ok) {
          if (reportResponse.status === 404) {
            throw new Error("Relatório não encontrado");
          }
          throw new Error(`HTTP error! status: ${reportResponse.status}`);
        }

        const data = await reportResponse.json();
        setReportData(data);
        setError(null);
      } catch (error) {
        console.error("Erro ao buscar dados do relatório:", error);
        setError("Erro ao carregar os dados do relatório");
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [codigo]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card>
          <MDBox p={3}>
            {loading && (
              <MDTypography variant="h6" textAlign="center">
                Carregando...
              </MDTypography>
            )}

            {error && (
              <MDTypography variant="h6" color="error" textAlign="center">
                {error}
              </MDTypography>
            )}

            {!loading && !error && reportData && (
              <>
                <Box display="flex" justifyContent="flex-end" mb={0} className="no-print">
                  <MDButton
                    variant="gradient"
                    color="info"
                    onClick={handlePrint}
                    startIcon={<Icon>print</Icon>}
                  >
                    Imprimir Relatório
                  </MDButton>
                </Box>

                <Box id="report-content">
                  {/* Cabeçalho */}
                  <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                    <MDTypography variant="h4" textAlign="center">
                      Relatório de Processamento de Unidade - {reportData.UnitNumber}
                    </MDTypography>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Informações do Procedimento */}
                  <ReportSection title="Informações do Procedimento">
                    <Grid container spacing={2}>
                      <ReportField label="Data" value={formatDateTime(reportData.StartDate).date} />
                      <ReportField
                        label="Hora Início"
                        value={formatDateTime(reportData.StartDate).time}
                      />
                      <ReportField
                        label="Hora Fim"
                        value={formatDateTime(reportData.EndDate).time}
                      />
                      <ReportField
                        label="Duração"
                        value={reportData.RunDuration ? `${reportData.RunDuration} min` : "---"}
                      />
                      <ReportField label="Bucket" value={reportData.BucketNumber} />
                      <ReportField label="Status" value={reportData.DonationStatusText} />
                      <ReportField
                        label="Selagem Bolsas"
                        value={reportData.Sealing == "1" ? "Sim" : "Não"}
                      />
                      <ReportField label="Operador" value={reportData.OperatorId} />
                      <ReportField
                        label="Temperatura Inicial"
                        value={
                          reportData.StartBasinTemperature
                            ? `${Number(reportData.StartBasinTemperature).toFixed(1)}°C`
                            : "---"
                        }
                      />
                      <ReportField
                        label="Temperatura Final"
                        value={
                          reportData.EndBasinTemperature
                            ? `${Number(reportData.EndBasinTemperature).toFixed(1)}°C`
                            : "---"
                        }
                      />
                    </Grid>
                  </ReportSection>

                  {/* Componentes */}
                  <ReportSection title="Componentes">
                    <Grid container spacing={2}>
                      <ReportField
                        label="Volume de Plaquetas"
                        value={
                          reportData.PlateletVolume ? `${reportData.PlateletVolume} mL` : "---"
                        }
                      />
                      <ReportField label="Índice Plaquetas" value={reportData.PlateletYieldIndex} />
                      <ReportField
                        label="Volume de Plasma"
                        value={
                          reportData.PlasmaVolume
                            ? `${(parseFloat(reportData.PlasmaVolume) / 1000).toFixed(2)} L`
                            : "---"
                        }
                      />
                      <ReportField
                        label="Volume de Leucopack"
                        value={
                          reportData.LeukocyteVolume ? `${reportData.LeukocyteVolume} mL` : "---"
                        }
                      />
                    </Grid>
                  </ReportSection>

                  {/* Alarmes e Alertas */}
                  <ReportSection title="Alarmes e Alertas">
                    {reportData.Alarms ? (
                      (() => {
                        const events = JSON.parse(reportData.Alarms);
                        return events.length > 0 ? (
                          <>
                            {/* Cabeçalho das colunas */}
                            <Grid container spacing={2} sx={{ mb: 2, fontWeight: "bold" }}>
                              <Grid item xs={2}>
                                <MDTypography variant="body2" fontWeight="bold">
                                  Hora
                                </MDTypography>
                              </Grid>
                              <Grid item xs={2}>
                                <MDTypography variant="body2" fontWeight="bold">
                                  Tipo
                                </MDTypography>
                              </Grid>
                              <Grid item xs={2}>
                                <MDTypography variant="body2" fontWeight="bold">
                                  Etapa
                                </MDTypography>
                              </Grid>
                              <Grid item xs={6}>
                                <MDTypography variant="body2" fontWeight="bold">
                                  Mensagem
                                </MDTypography>
                              </Grid>
                            </Grid>

                            {/* Dados */}
                            {events.map((alarm, index) => (
                              <Grid container key={index} spacing={2} sx={{ mb: 1 }}>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">
                                    {alarm.TimeStamp.split("T")[1].substring(0, 5)}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">{alarm.RunLogType}</MDTypography>
                                </Grid>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">{alarm.AlarmState}</MDTypography>
                                </Grid>
                                <Grid item xs={6}>
                                  <MDTypography variant="body2">
                                    {alarm.Message.split(" ").slice(1).join(" ")}
                                  </MDTypography>
                                </Grid>
                              </Grid>
                            ))}
                          </>
                        ) : (
                          <MDTypography variant="body2">Nenhum alarme registrado</MDTypography>
                        );
                      })()
                    ) : (
                      <MDTypography variant="body2">Nenhum alarme registrado</MDTypography>
                    )}
                  </ReportSection>

                  {/* Códigos de Barras */}
                  <ReportSection title="Códigos de Barras">
                    {reportData.BarcodeScans ? (
                      (() => {
                        const scans = JSON.parse(reportData.BarcodeScans);
                        return scans.length > 0 ? (
                          <>
                            {/* Cabeçalho das colunas */}
                            <Grid container spacing={2} sx={{ mb: 2, fontWeight: "bold" }}>
                              <Grid item xs={2}>
                                <MDTypography variant="body2" fontWeight="bold">
                                  Hora
                                </MDTypography>
                              </Grid>
                              <Grid item xs={3}>
                                <MDTypography variant="body2" fontWeight="bold">
                                  Tipo
                                </MDTypography>
                              </Grid>
                              <Grid item xs={3}>
                                <MDTypography variant="body2" fontWeight="bold">
                                  Nome
                                </MDTypography>
                              </Grid>
                              <Grid item xs={4}>
                                <MDTypography variant="body2" fontWeight="bold">
                                  Valor
                                </MDTypography>
                              </Grid>
                            </Grid>

                            {/* Dados */}
                            {scans.map((scan, index) => (
                              <Grid container key={index} spacing={2} sx={{ mb: 1 }}>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">
                                    {scan.ScanTime.split("T")[1].substring(0, 5)}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={3}>
                                  <MDTypography variant="body2">
                                    {scan.BarcodeSystemType}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={3}>
                                  <MDTypography variant="body2">{scan.BarcodeName}</MDTypography>
                                </Grid>
                                <Grid item xs={4}>
                                  <MDTypography variant="body2">{scan.RawScan}</MDTypography>
                                </Grid>
                              </Grid>
                            ))}
                          </>
                        ) : (
                          <MDTypography variant="body2">
                            Nenhum código de barras registrado
                          </MDTypography>
                        );
                      })()
                    ) : (
                      <MDTypography variant="body2">
                        Nenhum código de barras registrado
                      </MDTypography>
                    )}
                  </ReportSection>
                </Box>
              </>
            )}
          </MDBox>
        </Card>
      </Container>
    </DashboardLayout>
  );
}

export default ReveosReport;
