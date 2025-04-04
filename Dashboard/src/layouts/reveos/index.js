import React from "react";

// @mui material components
import { Grid } from "@mui/material";

// Material Dashboard 2 React components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Charts
import VerticalBarChart from "examples/Charts/BarCharts/VerticalBarChart";
import DefaultLineChart from "examples/Charts/LineCharts/DefaultLineChart";

// Data
import LastDonations from "layouts/reveos/components/data/lastDonations";
import totalComponents from "layouts/reveos/components/data/production";
import reveosDuration from "layouts/reveos/components/data/duration";
import useReveosMetric from "layouts/reveos/components/data/useReveosMetric";
import useAlarmFrequencyData from "layouts/reveos/components/data/alarmFrequency";

// Custom Components
import AlarmFrequencyChart from "layouts/reveos/components/AlarmFrequencyChart";

function Trima() {
  const components = totalComponents();
  const duration = reveosDuration();
  const plateletVolumeData = useReveosMetric("plateletVolume");
  const plasmaVolumeData = useReveosMetric("plasmaVolume");
  const plateletIndexData = useReveosMetric("plateletIndex");
  const totalPlasmaVolumeData = useReveosMetric("totalPlasmaVolume");

  const alarmData = useAlarmFrequencyData();

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "leaderboard" }}
                  title="Componentes processados"
                  description="Total de componentes processados por mês"
                  height="10rem"
                  chart={components}
                />
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "schedule" }}
                  title="Duração"
                  description="Duração média dos processos"
                  height="10rem"
                  chart={duration}
                />
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "bloodtype" }}
                  title="Volume Médio Plaquetas"
                  description="Volume médio das plaquetas"
                  height="10rem"
                  chart={plateletVolumeData}
                />
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "bloodtype" }}
                  title="PYI Plaquetas"
                  description="Índice plaquetário"
                  height="10rem"
                  chart={plateletIndexData}
                />
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "bloodtype" }}
                  title="Volume Médio de Plasma"
                  description="Volume médio por mês"
                  height="10rem"
                  chart={plasmaVolumeData}
                />
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "bloodtype" }}
                  title="Volume Total de Plasma"
                  description="Volume total por mês"
                  height="10rem"
                  chart={totalPlasmaVolumeData}
                />
              </Grid>
              <Grid item xs={12} md={12} mb={0}>
                <AlarmFrequencyChart
                  icon={{ color: "error", component: "warning" }}
                  title="Top 10 Alarmes"
                  description="Frequência nos últimos"
                  height="20rem"
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={4}>
            <LastDonations />
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default Trima;
