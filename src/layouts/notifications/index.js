import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`indicator-tabpanel-${index}`}
      aria-labelledby={`indicator-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Adiciona PropTypes para TabPanel
TabPanel.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

// Definição central dos indicadores
// Estrutura que contém todos os indicadores organizados por categoria
const INDICATOR_CONFIG = {
  dashboard: {
    id: "dashboardIndicators",
    title: "Dashboard",
    indicators: {
      doacoesPorAfereses: {
        id: "dashboard_doacoesPorAfereses",
        label: "Total de doações por Aféreses",
        default: false,
      },
      doacoesPorSangueTotal: {
        id: "dashboard_doacoesPorSangueTotal",
        label: "Total de doações por Sangue Total",
        default: false,
      },
      componentesProduzidos: {
        id: "componentesProduzidos",
        label: "Total de Componentes Produzidos",
        default: false,
      },
      produtividade: {
        id: "produtividade",
        label: "Produtividade",
        default: false,
      },
    },
  },
  trima: {
    id: "trimaIndicators",
    title: "Trima",
    indicators: {
      doacoesPorAfereses: {
        id: "trima_doacoesPorAfereses",
        label: "Total de doações por Aféreses (Trima)",
        default: false,
      },
      plaquetasOfertadasColetadas: {
        id: "plaquetasOfertadasColetadas",
        label: "Total de Plaquetas Oferecidas x Coletadas",
        default: false,
      },
      plaquetasPreDoador: {
        id: "plaquetasPreDoador",
        label: "Plaquetas Pré - Doador",
        default: false,
      },
      htHbPreDoador: {
        id: "htHbPreDoador",
        label: "Ht/Hb Pré - Doador",
        default: false,
      },
      duracaoProcedimentos: {
        id: "duracaoProcedimentos",
        label: "Duração dos procedimentos",
        default: false,
      },
      top10Alarmes: {
        id: "top10Alarmes",
        label: "Top 10 Alarmes",
        default: false,
      },
    },
  },
  reveos: {
    id: "reveosIndicators",
    title: "Reveos",
    indicators: {
      componentesProcessados: {
        id: "componentesProcessados",
        label: "Componentes processados",
        default: false,
      },
      duracao: {
        id: "duracao",
        label: "Duração",
        default: false,
      },
      volumeMedioPlaquetas: {
        id: "volumeMedioPlaquetas",
        label: "Volume Médio Plaquetas",
        default: false,
      },
      pyiPlaquetas: {
        id: "pyiPlaquetas",
        label: "PYI Plaquetas",
        default: false,
      },
      volumeMedioPlasma: {
        id: "volumeMedioPlasma",
        label: "Volume Médio de Plasma",
        default: false,
      },
      volumeTotalPlasma: {
        id: "volumeTotalPlasma",
        label: "Volume Total de Plasma",
        default: false,
      },
      top10Alarmes: {
        id: "top10AlarmesReveos",
        label: "Top 10 Alarmes - Reveos",
        default: false,
      },
    },
  },
};

// Função auxiliar para inicializar estado de indicadores a partir da configuração
const initializeIndicatorsState = (categoryConfig) => {
  return Object.keys(categoryConfig.indicators).reduce((acc, key) => {
    acc[key] = categoryConfig.indicators[key].default;
    return acc;
  }, {});
};

// Helpers para tratamento de notificações
const NOTIFICATION_HELPERS = {
  // Função para verificar se um objeto tem pelo menos um valor verdadeiro
  hasSelectedItems: (obj) => Object.values(obj).some((value) => value),

  // Função para contar itens selecionados em múltiplos objetos
  countSelectedItems: (objects) => {
    return objects.reduce((total, obj) => total + Object.values(obj).filter((v) => v).length, 0);
  },

  // Função para mapear nomes antigos para novos (compatibilidade)
  getCompatibilityMapping: () => ({
    // Dashboard
    totalDonationsAferese: "doacoesPorAfereses",
    totalDoacoesAferese: "doacoesPorAfereses",
    doacoesAferese: "doacoesPorAfereses",
    totalDonationsSangueTotal: "doacoesPorSangueTotal",
    totalDoacoesSangueTotal: "doacoesPorSangueTotal",
    doacoesSangueTotal: "doacoesPorSangueTotal",
    totalComponentesProduzidos: "componentesProduzidos",
    produtividadeGeral: "produtividade",
    produtividadePorUsuario: "produtividade",
    produtividadeUsuario: "produtividade",

    // Trima
    totalDonations: "trima_doacoesPorAfereses",
    totalDoacoes: "trima_doacoesPorAfereses",
    plateletOfferedVsCollected: "plaquetasOfertadasColetadas",
    totalOfertadoXColetado: "plaquetasOfertadasColetadas",
    plaquetasOfertadasXColetadas: "plaquetasOfertadasColetadas",
    plateletCount: "plaquetasPreDoador",
    hemoglobinLevels: "htHbPreDoador",
    procedureDuration: "duracaoProcedimentos",
    alarmFrequency: "top10Alarmes",

    // Reveos
    processedComponents: "componentesProcessados",
    totalComponentesProcessados: "componentesProcessados",
    processingTime: "duracao",
    plateletVolume: "volumeMedioPlaquetas",
    plateletYield: "pyiPlaquetas",
    plateletIndex: "pyiPlaquetas",
    plasmaVolume: "volumeMedioPlasma",
    totalPlasmaVolume: "volumeTotalPlasma",
    equipmentAlarms: "top10AlarmesReveos",
  }),

  // Função genérica para alternar estados
  toggleIndicator: (setState, state, key) => {
    setState({ ...state, [key]: !state[key] });
  },

  // Função genérica para selecionar todos
  selectAll: (setState, indicators) => {
    const result = {};
    Object.keys(indicators).forEach((key) => {
      result[key] = true;
    });
    setState(result);
  },

  // Função genérica para desmarcar todos
  deselectAll: (setState, indicators) => {
    const result = {};
    Object.keys(indicators).forEach((key) => {
      result[key] = false;
    });
    setState(result);
  },
};

function Notifications() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("weekly");

  // Inicializar estados de indicadores a partir da configuração central
  const [dashboardIndicators, setDashboardIndicators] = useState(
    initializeIndicatorsState(INDICATOR_CONFIG.dashboard)
  );
  const [trimaIndicators, setTrimaIndicators] = useState(
    initializeIndicatorsState(INDICATOR_CONFIG.trima)
  );
  const [reveosIndicators, setReveosIndicators] = useState(
    initializeIndicatorsState(INDICATOR_CONFIG.reveos)
  );

  // Simplificação do gerenciamento de snackbar
  const showSnackbar = (message, severity = "success") => {
    setSnackbarState({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const authToken = localStorage.getItem("authToken");
    const username = localStorage.getItem("userName");

    console.log("Dados do usuário:", { authToken: !!authToken, username });

    if (!authToken || !username) {
      console.error("Usuário não autenticado");
      showSnackbar("É necessário estar autenticado para configurar notificações", "error");
      return;
    }

    // Carregar configurações salvas do arquivo
    loadNotificationSettings();
  }, []);

  // Função para migrar configurações antigas para o novo formato (compatibilidade)
  const migrateOldSettings = (oldSettings) => {
    // Inicializar estados vazios para cada categoria
    const newDashboard = initializeIndicatorsState(INDICATOR_CONFIG.dashboard);
    const newTrima = initializeIndicatorsState(INDICATOR_CONFIG.trima);
    const newReveos = initializeIndicatorsState(INDICATOR_CONFIG.reveos);

    // Obter o mapeamento de nomes antigos para novos
    const mapping = NOTIFICATION_HELPERS.getCompatibilityMapping();

    // Processar indicadores do Dashboard
    if (oldSettings.dashboardIndicators) {
      Object.entries(oldSettings.dashboardIndicators).forEach(([key, value]) => {
        if (value) {
          // Verificar se é um nome antigo que precisa ser mapeado
          const newKey = mapping[key] || key;

          // Verificar em qual categoria o indicador pertence
          if (newKey in newDashboard) {
            newDashboard[newKey] = true;
          } else if (newKey in newTrima) {
            newTrima[newKey] = true;
          } else if (newKey in newReveos) {
            newReveos[newKey] = true;
          }
        }
      });
    }

    // Processar indicadores do Trima
    if (oldSettings.trimaIndicators) {
      Object.entries(oldSettings.trimaIndicators).forEach(([key, value]) => {
        if (value) {
          // Verificar se é um nome antigo que precisa ser mapeado
          const newKey = mapping[key] || key;

          // Verificar em qual categoria o indicador pertence
          if (newKey in newDashboard) {
            newDashboard[newKey] = true;
          } else if (newKey in newTrima) {
            newTrima[newKey] = true;
          } else if (newKey in newReveos) {
            newReveos[newKey] = true;
          }
        }
      });
    }

    // Processar indicadores do Reveos
    if (oldSettings.reveosIndicators) {
      Object.entries(oldSettings.reveosIndicators).forEach(([key, value]) => {
        if (value) {
          // Verificar se é um nome antigo que precisa ser mapeado
          const newKey = mapping[key] || key;

          // Verificar em qual categoria o indicador pertence
          if (newKey in newDashboard) {
            newDashboard[newKey] = true;
          } else if (newKey in newTrima) {
            newTrima[newKey] = true;
          } else if (newKey in newReveos) {
            newReveos[newKey] = true;
          }
        }
      });
    }

    return {
      dashboardIndicators: newDashboard,
      trimaIndicators: newTrima,
      reveosIndicators: newReveos,
      email: oldSettings.email || "",
      frequency: oldSettings.frequency || "weekly",
      lastUpdated: new Date().toISOString(),
      userId: oldSettings.userId || localStorage.getItem("userId") || "guest",
    };
  };

  // Função para carregar as configurações de notificações do arquivo
  const loadNotificationSettings = async () => {
    try {
      console.log("Carregando configurações do servidor...");

      // Obter o nome de usuário do localStorage
      const username = localStorage.getItem("userName");

      if (!username) {
        console.warn("Nome de usuário não encontrado no localStorage");
        showSnackbar("Erro ao carregar configurações: Usuário não identificado", "warning");
        return;
      }

      // Carregar do servidor (arquivo persistente)
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/notifications/settings`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (response.status === 200 && response.data) {
        // Se encontrou configurações no servidor
        const oldSettings = response.data;
        // Migrar configurações antigas para o novo formato
        const settings = migrateOldSettings(oldSettings);

        setEmail(settings.email || "");
        setFrequency(settings.frequency || "weekly");
        setDashboardIndicators(settings.dashboardIndicators);
        setTrimaIndicators(settings.trimaIndicators);
        setReveosIndicators(settings.reveosIndicators);

        // Atualizar também no localStorage para fallback
        localStorage.setItem("notificationSettings", JSON.stringify(settings));

        console.log("Configurações carregadas com sucesso do servidor");
      } else {
        // Se não encontrou configurações no servidor
        console.log("Nenhuma configuração encontrada no servidor. Verificando localStorage...");

        // Verificar se já existem configurações no localStorage como fallback
        const localSettings = localStorage.getItem("notificationSettings");

        if (localSettings) {
          try {
            const oldSettings = JSON.parse(localSettings);
            // Migrar configurações antigas para o novo formato
            const settings = migrateOldSettings(oldSettings);

            setEmail(settings.email || "");
            setFrequency(settings.frequency || "weekly");
            setDashboardIndicators(settings.dashboardIndicators);
            setTrimaIndicators(settings.trimaIndicators);
            setReveosIndicators(settings.reveosIndicators);

            console.log("Configurações carregadas do localStorage");

            // Salvar as configurações do localStorage no servidor
            saveToServer(settings);
          } catch (error) {
            console.error("Erro ao processar configurações locais:", error);
            showSnackbar("Erro ao carregar configurações salvas localmente", "error");
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações do servidor:", error);
      showSnackbar(`Erro ao carregar configurações: ${error.message}`, "error");

      // Em caso de erro, tenta usar o localStorage como fallback
      const localSettings = localStorage.getItem("notificationSettings");
      if (localSettings) {
        try {
          const oldSettings = JSON.parse(localSettings);
          // Migrar configurações antigas para o novo formato
          const settings = migrateOldSettings(oldSettings);

          setEmail(settings.email || "");
          setFrequency(settings.frequency || "weekly");
          setDashboardIndicators(settings.dashboardIndicators);
          setTrimaIndicators(settings.trimaIndicators);
          setReveosIndicators(settings.reveosIndicators);

          console.log("Usando configurações do localStorage como fallback");
        } catch (parseError) {
          console.error("Erro ao processar configurações locais:", parseError);
        }
      }
    }
  };

  // Função otimizada para salvar as configurações no servidor
  const saveToServer = async (notificationData, retryCount = 0) => {
    try {
      console.log("Salvando configurações no servidor...");

      // Obter o nome de usuário do localStorage
      const username = localStorage.getItem("userName");

      if (!username) {
        console.warn("Nome de usuário não encontrado no localStorage");
        showSnackbar("Erro ao salvar: Usuário não identificado", "warning");
        return false;
      }

      // Adicionar o nome de usuário aos dados
      const dataToSave = {
        ...notificationData,
        username,
        userId: localStorage.getItem("userId") || "guest",
        lastUpdated: new Date().toISOString(),
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/notifications/settings`,
        dataToSave,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          timeout: 5000, // Timeout de 5 segundos
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Erro ao salvar no servidor: ${response.statusText}`);
      }

      console.log("Configurações salvas com sucesso no servidor");
      return true;
    } catch (error) {
      console.error("Erro ao salvar configurações no servidor:", error);

      // Se houver falha de conectividade ou timeout, tentar novamente (até 2 vezes)
      if (
        retryCount < 2 &&
        (error.code === "ECONNABORTED" ||
          error.message.includes("timeout") ||
          error.message.includes("Network Error"))
      ) {
        console.log(`Tentando novamente (${retryCount + 1} de 2)...`);
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await saveToServer(notificationData, retryCount + 1);
            resolve(result);
          }, 1000); // Aguardar 1 segundo antes de tentar novamente
        });
      }

      showSnackbar(
        `Erro ao salvar no servidor: ${error.message}. As configurações foram salvas localmente.`,
        "warning"
      );
      return false;
    }
  };

  // Função para enviar email de teste - versão otimizada
  const handleTestEmail = async () => {
    if (!email) {
      showSnackbar("Por favor, informe um email válido", "warning");
      return;
    }

    try {
      showSnackbar("Enviando email de teste...", "info");

      // Obter o nome de usuário do localStorage
      const username = localStorage.getItem("userName");

      if (!username) {
        showSnackbar("Erro ao enviar email: Usuário não identificado", "warning");
        return;
      }

      // Verificar se há indicadores selecionados
      const hasSelectedIndicator = [dashboardIndicators, trimaIndicators, reveosIndicators].some(
        NOTIFICATION_HELPERS.hasSelectedItems
      );

      // Tentar enviar o email de teste
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/notifications/test-email`,
        {
          email,
          frequency,
          indicators: hasSelectedIndicator
            ? {
                dashboardIndicators,
                trimaIndicators,
                reveosIndicators,
              }
            : null,
          username,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          timeout: 10000, // 10 segundos de timeout
        }
      );

      if (response.status === 200) {
        showSnackbar(
          hasSelectedIndicator
            ? "Email de teste com dados reais enviado com sucesso! Verifique sua caixa de entrada."
            : "Email de teste enviado com sucesso! Verifique sua caixa de entrada.",
          "success"
        );
      } else {
        throw new Error("Erro ao enviar email de teste");
      }
    } catch (error) {
      console.error("Erro ao enviar email de teste:", error);

      // Formatar mensagem de erro mais amigável
      let errorMessage = "Falha ao enviar email de teste";

      if (error.response?.data?.details) {
        // Se o erro contém detalhes da API
        errorMessage += `: ${error.response.data.details}`;

        // Adicionar dicas específicas para erros comuns
        if (
          error.response.data.details.includes("Invalid login") ||
          error.response.data.details.includes("Username and Password not accepted")
        ) {
          errorMessage +=
            ". Verifique as configurações de email do servidor (autenticação em dois fatores ou senha de aplicativo)";
        }
      } else if (error.message) {
        // Erro genérico
        errorMessage += `: ${error.message}`;
      }

      showSnackbar(errorMessage, "error");
    }
  };

  // Função para navegar entre etapas do formulário
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Funções genéricas para manipular indicadores usando o NOTIFICATION_HELPERS
  const handleDashboardChange = (key) =>
    NOTIFICATION_HELPERS.toggleIndicator(setDashboardIndicators, dashboardIndicators, key);

  const handleTrimaChange = (key) =>
    NOTIFICATION_HELPERS.toggleIndicator(setTrimaIndicators, trimaIndicators, key);

  const handleReveosChange = (key) =>
    NOTIFICATION_HELPERS.toggleIndicator(setReveosIndicators, reveosIndicators, key);

  // Funções para selecionar/desselecionar todos os indicadores
  const selectAllDashboard = () =>
    NOTIFICATION_HELPERS.selectAll(setDashboardIndicators, dashboardIndicators);

  const selectAllTrima = () => NOTIFICATION_HELPERS.selectAll(setTrimaIndicators, trimaIndicators);

  const selectAllReveos = () =>
    NOTIFICATION_HELPERS.selectAll(setReveosIndicators, reveosIndicators);

  const deselectAllDashboard = () =>
    NOTIFICATION_HELPERS.deselectAll(setDashboardIndicators, dashboardIndicators);

  const deselectAllTrima = () =>
    NOTIFICATION_HELPERS.deselectAll(setTrimaIndicators, trimaIndicators);

  const deselectAllReveos = () =>
    NOTIFICATION_HELPERS.deselectAll(setReveosIndicators, reveosIndicators);

  // Função para obter rótulo de indicador
  const getIndicatorLabel = (category, key) => {
    try {
      return INDICATOR_CONFIG[category].indicators[key].label;
    } catch (error) {
      console.warn(`Indicador não encontrado: ${category}.${key}`);
      return key; // Fallback para o nome da chave
    }
  };

  // Função para contar indicadores selecionados
  const countSelectedIndicators = () =>
    NOTIFICATION_HELPERS.countSelectedItems([
      dashboardIndicators,
      trimaIndicators,
      reveosIndicators,
    ]);

  // Função otimizada para salvar as configurações
  const handleSave = async () => {
    try {
      // Verificar se pelo menos um indicador foi selecionado
      const hasSelectedIndicator = [dashboardIndicators, trimaIndicators, reveosIndicators].some(
        NOTIFICATION_HELPERS.hasSelectedItems
      );

      if (!hasSelectedIndicator) {
        showSnackbar("Selecione pelo menos um indicador para continuar", "warning");
        return;
      }

      if (!email) {
        showSnackbar("Por favor, informe um email válido", "warning");
        return;
      }

      // Obter o nome de usuário do localStorage
      const username = localStorage.getItem("userName");

      if (!username) {
        showSnackbar("Erro ao salvar: Usuário não identificado", "warning");
        return;
      }

      // Mostrar indicador de carregamento para o usuário
      showSnackbar("Salvando configurações...", "info");

      const notificationData = {
        email,
        frequency,
        dashboardIndicators,
        trimaIndicators,
        reveosIndicators,
        lastUpdated: new Date().toISOString(),
        userId: localStorage.getItem("userId") || "guest",
        username,
      };

      // Salvar no localStorage como fallback
      localStorage.setItem("notificationSettings", JSON.stringify(notificationData));
      console.log("Configurações salvas localmente no localStorage");

      // Salvar no servidor (arquivo persistente)
      const serverSaved = await saveToServer(notificationData);

      // Feedback visual para o usuário
      if (serverSaved) {
        showSnackbar("Configurações salvas com sucesso!");
      } else {
        // Verificar conexão com o servidor
        try {
          await axios.get(`${process.env.REACT_APP_API_URL}/api/health`, {
            timeout: 3000,
          });
          // Se conseguir conectar ao servidor mas falhou ao salvar
          showSnackbar(
            "Configurações salvas localmente, mas houve um problema específico ao salvar no servidor. Tente novamente mais tarde.",
            "warning"
          );
        } catch (connectionError) {
          // Se não conseguir conectar ao servidor
          showSnackbar(
            "Configurações salvas localmente. Não foi possível conectar ao servidor. Verifique sua conexão.",
            "warning"
          );
        }
      }
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      showSnackbar("Erro ao salvar configurações. Por favor, tente novamente.", "error");
    }
  };

  const steps = ["Selecionar Indicadores", "Configurar Email", "Revisar e Salvar"];

  // Componente otimizado para renderizar a seleção de indicadores por categoria
  const CategoryIndicators = ({ category, indicators, setIndicators, onSelect, onDeselect }) => {
    const categoryConfig = INDICATOR_CONFIG[category];
    const selectedCount = Object.values(indicators).filter((v) => v).length;
    const totalCount = Object.keys(indicators).length;

    return (
      <MDBox>
        <MDBox display="flex" justifyContent="space-between" mb={2}>
          <MDTypography variant="subtitle1">
            Indicadores {categoryConfig.title} ({selectedCount}/{totalCount})
          </MDTypography>
          <MDBox>
            <Button size="small" onClick={onSelect} sx={{ mr: 1 }}>
              Selecionar Todos
            </Button>
            <Button size="small" onClick={onDeselect}>
              Limpar Seleção
            </Button>
          </MDBox>
        </MDBox>

        <Grid container spacing={2}>
          {Object.entries(indicators).map(([key, value]) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={value}
                    onChange={() =>
                      NOTIFICATION_HELPERS.toggleIndicator(setIndicators, indicators, key)
                    }
                    color="primary"
                  />
                }
                label={getIndicatorLabel(category, key)}
              />
            </Grid>
          ))}
        </Grid>
      </MDBox>
    );
  };

  // Validação de props para CategoryIndicators
  CategoryIndicators.propTypes = {
    category: PropTypes.string.isRequired,
    indicators: PropTypes.object.isRequired,
    setIndicators: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    onDeselect: PropTypes.func.isRequired,
  };

  // Componente para seleção de indicadores
  const renderIndicatorSelection = () => (
    <>
      <MDTypography variant="h6" gutterBottom>
        Selecione os indicadores para receber notificações
      </MDTypography>

      <MDTypography variant="body2" color="text.secondary" mb={2}>
        Selecione os indicadores que deseja monitorar através de notificações por email.
      </MDTypography>

      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={INDICATOR_CONFIG.dashboard.title} />
        <Tab label={INDICATOR_CONFIG.trima.title} />
        <Tab label={INDICATOR_CONFIG.reveos.title} />
      </Tabs>

      {/* Uso do componente CategoryIndicators para cada categoria */}
      <TabPanel value={selectedTab} index={0}>
        <CategoryIndicators
          category="dashboard"
          indicators={dashboardIndicators}
          setIndicators={setDashboardIndicators}
          onSelect={selectAllDashboard}
          onDeselect={deselectAllDashboard}
        />
      </TabPanel>

      <TabPanel value={selectedTab} index={1}>
        <CategoryIndicators
          category="trima"
          indicators={trimaIndicators}
          setIndicators={setTrimaIndicators}
          onSelect={selectAllTrima}
          onDeselect={deselectAllTrima}
        />
      </TabPanel>

      <TabPanel value={selectedTab} index={2}>
        <CategoryIndicators
          category="reveos"
          indicators={reveosIndicators}
          setIndicators={setReveosIndicators}
          onSelect={selectAllReveos}
          onDeselect={deselectAllReveos}
        />
      </TabPanel>
    </>
  );

  // Componente para configuração de email
  const renderEmailConfiguration = () => (
    <>
      <MDTypography variant="h6" gutterBottom>
        Configuração de Email
      </MDTypography>

      <MDTypography variant="body2" color="text.secondary" mb={3}>
        Informe o email onde deseja receber as notificações e a frequência desejada.
      </MDTypography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <MDInput
            type="email"
            label="Email para notificações"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@exemplo.com"
            required
          />
          <MDBox display="flex" justifyContent="flex-end" mt={1}>
            <MDButton
              variant="outlined"
              color="info"
              onClick={handleTestEmail}
              disabled={!email}
              size="small"
            >
              Enviar Email de Teste
            </MDButton>
          </MDBox>
        </Grid>
        <Grid item xs={12}>
          <MDInput
            select
            label="Frequência de envio"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            fullWidth
            sx={{
              "& .MuiSelect-select": {
                padding: "0.75rem",
                minHeight: "1.4375em",
                height: "1.4375em",
                display: "flex",
                alignItems: "center",
              },
              "& .MuiInputBase-input": {
                height: "1.4375em",
              },
              "& .MuiOutlinedInput-root": {
                paddingTop: "0.75rem",
                paddingBottom: "0.75rem",
              },
            }}
          >
            <MenuItem value="daily">Diária</MenuItem>
            <MenuItem value="weekly">Semanal</MenuItem>
            <MenuItem value="monthly">Mensal</MenuItem>
          </MDInput>
        </Grid>

        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, mt: 2, backgroundColor: "#f8f9fa" }}>
            <MDTypography variant="subtitle2" gutterBottom color="info">
              Informações sobre a frequência de envio:
            </MDTypography>
            <MDBox component="ul" sx={{ pl: 2, mt: 1, mb: 0 }}>
              <li>
                <MDTypography variant="body2" color="text.secondary">
                  <strong>Diária:</strong> Emails serão enviados todos os dias às 7h da manhã
                </MDTypography>
              </li>
              <li>
                <MDTypography variant="body2" color="text.secondary">
                  <strong>Semanal:</strong> Emails serão enviados todas as segundas-feiras às 7h da
                  manhã
                </MDTypography>
              </li>
              <li>
                <MDTypography variant="body2" color="text.secondary">
                  <strong>Mensal:</strong> Emails serão enviados no primeiro dia de cada mês às 7h
                  da manhã
                </MDTypography>
              </li>
            </MDBox>
          </Paper>
        </Grid>
      </Grid>
    </>
  );

  // Componente otimizado para listar os indicadores selecionados
  const SelectedIndicatorsList = ({ category, indicators }) => {
    if (!NOTIFICATION_HELPERS.hasSelectedItems(indicators)) return null;

    return (
      <>
        <MDTypography
          variant="subtitle2"
          gutterBottom
          sx={{ mt: category !== "dashboard" ? 2 : 0 }}
        >
          {INDICATOR_CONFIG[category].title}:
        </MDTypography>
        <Box component="ul" sx={{ pl: 2, mt: 0 }}>
          {Object.entries(indicators)
            .filter(([_, value]) => value)
            .map(([key]) => (
              <li key={key}>
                <MDTypography variant="body2">{getIndicatorLabel(category, key)}</MDTypography>
              </li>
            ))}
        </Box>
      </>
    );
  };

  // Validação de props para SelectedIndicatorsList
  SelectedIndicatorsList.propTypes = {
    category: PropTypes.string.isRequired,
    indicators: PropTypes.object.isRequired,
  };

  // Componente para resumo das configurações
  const renderSummary = () => {
    const hasSelectedIndicator = [dashboardIndicators, trimaIndicators, reveosIndicators].some(
      NOTIFICATION_HELPERS.hasSelectedItems
    );

    return (
      <>
        <MDTypography variant="h6" gutterBottom>
          Resumo das Configurações
        </MDTypography>

        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <MDTypography variant="subtitle2">Email:</MDTypography>
              <MDTypography variant="body2" mb={2}>
                {email}
              </MDTypography>

              <MDTypography variant="subtitle2">Frequência:</MDTypography>
              <MDTypography variant="body2" mb={2}>
                {frequency === "daily" ? "Diária" : frequency === "weekly" ? "Semanal" : "Mensal"}
              </MDTypography>

              <MDTypography variant="subtitle2">Total de indicadores selecionados:</MDTypography>
              <MDTypography variant="body2">{countSelectedIndicators()}</MDTypography>
            </Grid>

            <Grid item xs={12} md={6}>
              <MDTypography variant="subtitle2" gutterBottom>
                Indicadores por categoria:
              </MDTypography>
              <MDBox component="ul" sx={{ pl: 2, mt: 0 }}>
                <li>
                  <MDTypography variant="body2">
                    Dashboard: {Object.values(dashboardIndicators).filter((v) => v).length}
                  </MDTypography>
                </li>
                <li>
                  <MDTypography variant="body2">
                    Trima: {Object.values(trimaIndicators).filter((v) => v).length}
                  </MDTypography>
                </li>
                <li>
                  <MDTypography variant="body2">
                    Reveos: {Object.values(reveosIndicators).filter((v) => v).length}
                  </MDTypography>
                </li>
              </MDBox>
            </Grid>
          </Grid>
        </Paper>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <MDTypography variant="subtitle2">Ver indicadores selecionados</MDTypography>
          </AccordionSummary>
          <AccordionDetails>
            {hasSelectedIndicator ? (
              <>
                <SelectedIndicatorsList category="dashboard" indicators={dashboardIndicators} />
                <SelectedIndicatorsList category="trima" indicators={trimaIndicators} />
                <SelectedIndicatorsList category="reveos" indicators={reveosIndicators} />
              </>
            ) : (
              <MDTypography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                Nenhum indicador selecionado.
              </MDTypography>
            )}
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  // Função para renderizar o conteúdo com base na etapa atual
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderIndicatorSelection();
      case 1:
        return renderEmailConfiguration();
      case 2:
        return renderSummary();
      default:
        return "Passo desconhecido";
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container justifyContent="center" spacing={3}>
          <Grid item xs={12} xl={10}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h4" mb={3}>
                  Configuração de Notificações
                </MDTypography>

                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                {getStepContent(activeStep)}

                <MDBox mt={4} display="flex" justifyContent="space-between">
                  <Button disabled={activeStep === 0} onClick={handleBack}>
                    Voltar
                  </Button>

                  {activeStep === steps.length - 1 ? (
                    <MDButton variant="gradient" color="info" onClick={handleSave}>
                      Salvar Configurações
                    </MDButton>
                  ) : (
                    <MDButton variant="contained" color="info" onClick={handleNext}>
                      Próximo
                    </MDButton>
                  )}
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      <Snackbar
        open={snackbarState.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarState.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>

      <Footer />
    </DashboardLayout>
  );
}

export default Notifications;
