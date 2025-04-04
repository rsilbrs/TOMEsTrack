import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { Card, Grid, Divider, Container, Box, Button } from "@mui/material";
import Icon from "@mui/material/Icon";

// Components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import TrimaIcon from "components/CustomIcons/Trima";
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
      margin-top: -10px;
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

function TrimaReport() {
  const { codigo } = useParams(); // Este é o CodigoDoacao
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTypeIcon = (type) => {
    switch (type.toLowerCase()) {
      // Alertas
      case "alert":
      case "alerta":
        return "⚠️";

      case "alarm":
      case "alarme":
      case "alarma":
        return "🚨";

      case "adjustment":
      case "ajuste":
        return "🛠️";

      default:
        return "";
    }
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = printStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Função para converter milissegundos para hh:mm:ss após divisão por 10.000
  const formatDuration = (milliseconds) => {
    // Dividir por 10.000
    const adjustedSeconds = milliseconds / 10000000;

    // Calcular horas, minutos e segundos
    const hours = Math.floor(adjustedSeconds / 3600);
    const minutes = Math.floor((adjustedSeconds % 3600) / 60);

    // Formatar com duas casas
    const formattedHours = String(hours).padStart(2, "0");
    const formattedMinutes = String(minutes).padStart(2, "0");

    return `${formattedHours}:${formattedMinutes}`;
  };

  const formatDurationHHMM = (duration) => duration?.substring(0, 5) || "---";

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");

        // Primeiro, buscar o SessionID correspondente ao CodigoDoacao
        const proceduresResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/api/apheresisProcedures`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!proceduresResponse.ok) {
          throw new Error(`HTTP error! status: ${proceduresResponse.status}`);
        }

        const proceduresData = await proceduresResponse.json();
        const procedure = proceduresData.find((proc) => proc.CodigoDoacao === codigo);

        if (!procedure) {
          throw new Error("Procedimento não encontrado");
        }

        const sessionId = procedure.SessinID; // Usando o SessionID encontrado

        // Agora, buscar os dados do relatório usando o SessionID
        const reportResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/api/trimaReport/${sessionId}`,
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
                      Relatório de Procedimento Trima - {codigo}
                    </MDTypography>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <ReportSection title="Informações do Doador">
                    <Grid container spacing={2}>
                      <ReportField label="Nome" value={reportData.DonorName} />
                      <ReportField label="Data de Nascimento" value={reportData.DOB} />
                      <ReportField label="Sexo" value={reportData.DonorGender} />
                      <ReportField
                        label="Peso"
                        value={
                          reportData.DonorWeight
                            ? `${reportData.DonorWeight} ${reportData.DonorWeightUnit}`
                            : "---"
                        }
                      />
                      <ReportField
                        label="Altura"
                        value={
                          reportData.DonorHeight
                            ? `${reportData.DonorHeight} ${reportData.DonorHeightUnit}`
                            : "---"
                        }
                      />
                      <ReportField
                        label="Hematócrito"
                        value={
                          reportData.DonorHematocrit ? `${reportData.DonorHematocrit}%` : "---"
                        }
                      />
                      <ReportField
                        label="Plaquetas Pré"
                        value={
                          reportData.DonorPreCount ? `${reportData.DonorPreCount} x10³/mL` : "---"
                        }
                      />
                      <ReportField label="Tipo Sanguíneo" value={reportData.DonorBloodType} />
                    </Grid>
                  </ReportSection>

                  {/* Dados do Procedimento */}
                  <ReportSection title="Dados do Procedimento">
                    <Grid container spacing={2}>
                      <ReportField
                        label="Data"
                        value={
                          reportData.ProcedureDate
                            ? new Date(reportData.ProcedureDate).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "---"
                        }
                      />
                      <ReportField
                        label="Início Extração"
                        value={
                          reportData.ProcedureDate
                            ? new Date(reportData.ProcedureDate).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "---"
                        }
                      />
                      <ReportField
                        label="Duração"
                        value={formatDuration(reportData.DurationOfRun)}
                      />
                      <ReportField
                        label="Volume Processado"
                        value={reportData.VbpTotal ? `${reportData.VbpTotal} mL` : "---"}
                      />
                      <ReportField label="Número de Série" value={reportData.SerialNumber} />
                      <ReportField
                        label="Identificação do Dispositivo"
                        value={reportData.DeviceShortName}
                      />
                      <ReportField label="Descartável" value={reportData.CassetteTypeRefId} />
                      <ReportField
                        label="Hematócrito Pós"
                        value={
                          reportData.DonorPostHematocrit
                            ? `${reportData.DonorPostHematocrit}%`
                            : "---"
                        }
                      />
                      <ReportField
                        label="Plaquetas Pós"
                        value={
                          reportData.DonorPostCount ? `${reportData.DonorPostCount} x10³/mL` : "---"
                        }
                      />
                    </Grid>
                  </ReportSection>

                  {/* Concentrado de Plaquetas - só exibe se Yield > 0 */}
                  {reportData.Yield > 0 && (
                    <ReportSection title="Concentrado de Plaquetas">
                      <Grid container spacing={2}>
                        <ReportField
                          label="Rendimento Coletado"
                          value={`${reportData.Yield} x 10¹¹`}
                        />
                        <ReportField label="Volume Coletado" value={`${reportData.BagVolume} mL`} />
                      </Grid>
                    </ReportSection>
                  )}

                  {/* Plasma - só exibe se BagVolumePlasma > 0 */}
                  {reportData.BagVolumePlasma > 0 && (
                    <ReportSection title="Plasma">
                      <Grid container spacing={2}>
                        <ReportField
                          label="Volume Coletado"
                          value={`${reportData.BagVolumePlasma} mL`}
                        />
                      </Grid>
                    </ReportSection>
                  )}

                  {/* Concentrados de Hemácias - só exibe se alguma bolsa tem volume > 0 */}
                  {(reportData.BagVolumeRBC1 > 0 || reportData.BagVolumeRBC2 > 0) && (
                    <ReportSection title="Concentrados de Hemácias">
                      <Grid container spacing={2}>
                        {reportData.BagVolumeRBC1 > 0 && (
                          <ReportField
                            label="Volume Bolsa 1"
                            value={`${reportData.BagVolumeRBC1} mL`}
                          />
                        )}
                        {reportData.BagVolumeRBC2 > 0 && (
                          <ReportField
                            label="Volume Bolsa 2"
                            value={`${reportData.BagVolumeRBC2} mL`}
                          />
                        )}
                      </Grid>
                    </ReportSection>
                  )}

                  {/* Mensagens de Verificação */}
                  {reportData.ExtendedInfoVerificationMessages ? (
                    <ReportSection title="Mensagens de Verificação">
                      <Box ml={2}>
                        <Grid container spacing={2}>
                          {JSON.parse(reportData.ExtendedInfoVerificationMessages).length > 0 ? (
                            <>
                              {/* Cabeçalho das colunas */}
                              <Grid container spacing={2} sx={{ mb: 0 }}>
                                <Grid item xs={6}>
                                  <MDTypography variant="caption" color="text" fontWeight="bold">
                                    Mensagem
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={6}>
                                  <MDTypography variant="caption" color="text" fontWeight="bold">
                                    Motivo
                                  </MDTypography>
                                </Grid>
                              </Grid>

                              {/* Dados */}
                              {JSON.parse(reportData.ExtendedInfoVerificationMessages).map(
                                (message, index) => (
                                  <Grid container key={index} spacing={2} sx={{ mb: 1 }}>
                                    <Grid item xs={6}>
                                      <MDTypography variant="body2">
                                        {message.VerificationMessage}
                                      </MDTypography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <MDTypography variant="body2">{message.Reason}</MDTypography>
                                    </Grid>
                                  </Grid>
                                )
                              )}
                            </>
                          ) : (
                            <Grid item xs={12}>
                              <MDTypography variant="body2">
                                Sem mensagens de verificação
                              </MDTypography>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    </ReportSection>
                  ) : (
                    <ReportSection title="Mensagens de Verificação">
                      <Box ml={2}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <MDTypography variant="body2">
                              Sem mensagens de verificação
                            </MDTypography>
                          </Grid>
                        </Grid>
                      </Box>
                    </ReportSection>
                  )}

                  {/* Seleções de Procedimento */}
                  <ReportSection title="Seleções de Procedimento">
                    {reportData.ExtendedInfoProcedureSelections ? (
                      (() => {
                        const selections = JSON.parse(reportData.ExtendedInfoProcedureSelections);
                        return selections.length > 0 ? (
                          <>
                            {/* Cabeçalho das colunas */}
                            <Grid container spacing={2} sx={{ mb: 0, fontWeight: "bold" }}>
                              <Grid item xs={1}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Hora
                                </MDTypography>
                              </Grid>
                              <Grid item xs={3}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Plaquetas
                                </MDTypography>
                              </Grid>
                              <Grid item xs={2}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Hemácias
                                </MDTypography>
                              </Grid>
                              <Grid item xs={2}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Plasma
                                </MDTypography>
                              </Grid>
                              <Grid item xs={2}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Duração
                                </MDTypography>
                              </Grid>
                              <Grid item xs={2}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Tipo
                                </MDTypography>
                              </Grid>
                            </Grid>

                            {selections.map((selection, index) => (
                              <Grid container key={index} spacing={2} sx={{ mb: 1 }}>
                                <Grid item xs={1}>
                                  <MDTypography variant="body2">
                                    {new Date(selection.Timestamp).toLocaleTimeString("pt-BR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={3}>
                                  <MDTypography variant="body2">
                                    {`${Number(selection.PlateletYield).toFixed(1)}x10¹¹ / ${
                                      selection.PlateletVolume
                                    }mL`}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">
                                    {selection.RBC > 0 ? `${selection.RBC}mL` : "---"}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">
                                    {selection.Plasma > 0 ? `${selection.Plasma}mL` : "---"}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">
                                    {formatDurationHHMM(selection.Duration)}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">
                                    {selection.ProcedureType}
                                  </MDTypography>
                                </Grid>
                              </Grid>
                            ))}
                          </>
                        ) : (
                          <MDTypography variant="body2">Sem seleções de procedimento</MDTypography>
                        );
                      })()
                    ) : (
                      <MDTypography variant="body2">Sem seleções de procedimento</MDTypography>
                    )}
                  </ReportSection>

                  {/* Códigos de Barras */}
                  <ReportSection title="Códigos de Barras">
                    {reportData.Barcodes ? (
                      (() => {
                        const barcodes = JSON.parse(reportData.Barcodes);
                        return barcodes.length > 0 ? (
                          <>
                            {/* Cabeçalho das colunas */}
                            <Box ml={0}>
                              <Grid container spacing={2} sx={{ mb: 0 }}>
                                <Grid item xs={1}>
                                  <MDTypography variant="caption" color="text" fontWeight="bold">
                                    Hora
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={6}>
                                  <MDTypography variant="caption" color="text" fontWeight="bold">
                                    Nome/Categoria
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={4}>
                                  <MDTypography variant="caption" color="text" fontWeight="bold">
                                    Valor
                                  </MDTypography>
                                </Grid>
                              </Grid>

                              {/* Dados */}
                              {barcodes.map((barcode, index) => {
                                // Processa o valor considerando prefixos e sufixos
                                let displayValue = barcode.value;
                                if (barcode.prefix || barcode.sufix) {
                                  const start = barcode.prefix || 0;
                                  const end = barcode.sufix ? -barcode.sufix : undefined;
                                  displayValue = barcode.value.slice(start, end);
                                }

                                return (
                                  <Grid container key={index} spacing={2} sx={{ mb: 1 }}>
                                    <Grid item xs={1}>
                                      <MDTypography variant="body2">
                                        {new Date(barcode.time).toLocaleTimeString("pt-BR", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </MDTypography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <MDTypography variant="body2">
                                        {`${barcode.name} (${barcode.category})`}
                                      </MDTypography>
                                    </Grid>
                                    <Grid item xs={4}>
                                      <MDTypography variant="body2">{displayValue}</MDTypography>
                                    </Grid>
                                  </Grid>
                                );
                              })}
                            </Box>
                          </>
                        ) : (
                          <Box ml={2}>
                            <MDTypography variant="body2">
                              Sem códigos de barras registrados
                            </MDTypography>
                          </Box>
                        );
                      })()
                    ) : (
                      <Box ml={2}>
                        <MDTypography variant="body2">
                          Sem códigos de barras registrados
                        </MDTypography>
                      </Box>
                    )}
                  </ReportSection>

                  {/* Alertas, Alarmes e Ajustes */}
                  <ReportSection title="Alertas, Alarmes e Ajustes">
                    {reportData.ExtendedInfoAlarmsAlertsAdvisoriesAdjustments ? (
                      (() => {
                        const events = JSON.parse(
                          reportData.ExtendedInfoAlarmsAlertsAdvisoriesAdjustments
                        );
                        return events.length > 0 ? (
                          <>
                            {/* Cabeçalho das colunas */}
                            <Grid container spacing={2} sx={{ mb: 0, fontWeight: "bold" }}>
                              <Grid item xs={1}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Hora
                                </MDTypography>
                              </Grid>
                              <Grid item xs={2}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Tipo
                                </MDTypography>
                              </Grid>
                              <Grid item xs={7}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Nome
                                </MDTypography>
                              </Grid>
                              <Grid item xs={2}>
                                <MDTypography variant="caption" color="text" fontWeight="bold">
                                  Autenticado por
                                </MDTypography>
                              </Grid>
                            </Grid>

                            {/* Dados */}
                            {events.map((event, index) => (
                              <Grid container key={index} spacing={2} sx={{ mb: 1 }}>
                                <Grid item xs={1}>
                                  <MDTypography variant="body2">
                                    {new Date(event.Timestamp).toLocaleTimeString("pt-BR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">
                                    {getTypeIcon(event.Type)} {event.Type}
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={7}>
                                  <MDTypography variant="body2">{event.Name}</MDTypography>
                                </Grid>
                                <Grid item xs={2}>
                                  <MDTypography variant="body2">
                                    {event.AuthenticatedBy || "---"}
                                  </MDTypography>
                                </Grid>
                              </Grid>
                            ))}
                          </>
                        ) : (
                          <MDTypography variant="body2">
                            Sem Alertas, Alarmes e Ajustes
                          </MDTypography>
                        );
                      })()
                    ) : (
                      <MDTypography variant="body2">Sem Alertas, Alarmes e Ajustes</MDTypography>
                    )}
                  </ReportSection>

                  <Box mt={4} pt={3} borderTop={1} borderColor="divider">
                    <MDTypography variant="caption" color="text">
                      Relatório gerado em {new Date().toLocaleString()}
                    </MDTypography>
                  </Box>
                </Box>
              </>
            )}
          </MDBox>
        </Card>
      </Container>
    </DashboardLayout>
  );
}

export default TrimaReport;
