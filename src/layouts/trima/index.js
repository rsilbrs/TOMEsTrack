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
import totalAferese from "layouts/dashboard/data/totalAferese";
import totalComponents from "layouts/trima/components/data/offered_collected";
import LastDonations from "layouts/trima/components/data/lastDonations";
import donorhbht from "layouts/trima/components/data/hthb";
import donorPlt from "layouts/trima/components/data/platelet";
import apheresisDuration from "layouts/trima/components/data/duration";
import useAlarmFrequencyData from "layouts/trima/components/data/alarmFrequency";

// Custom Components
import AlarmFrequencyChart from "layouts/trima/components/AlarmFrequencyChart";
import UncollectedComponents from "layouts/trima/components/UncollectedComponents";

function Trima() {
  const aferese = totalAferese();
  const components = totalComponents();
  const hbht = donorhbht();
  const plt = donorPlt();
  const duration = apheresisDuration();
  const alarmData = useAlarmFrequencyData();

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={12} lg={12}>
                <MDBox mb={3}>
                  <DefaultLineChart
                    icon={{ color: "dark", component: "leaderboard" }}
                    title="Total de Plaquetas Oferecidas x Coletadas"
                    description="Componentes oferecidos versus coletados por mês"
                    height="15rem"
                    chart={components}
                  />
                </MDBox>
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "bloodtype" }}
                  title="Plaquetas Pré - Doador"
                  description="Contagem de plaquetas pré-doação"
                  height="10rem"
                  chart={plt}
                />
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "bloodtype" }}
                  title="Ht/Hb Pré - Doador"
                  description="Hematócrito/Hemoglobina do doador"
                  height="10rem"
                  chart={hbht}
                />
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "schedule" }}
                  title="Duração dos procedimentos"
                  description="Procedimentos por mês"
                  height="10rem"
                  chart={duration}
                />
              </Grid>
              <Grid item xs={12} md={6} mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "leaderboard" }}
                  title="Total de doações por Aféreses"
                  description="Procedimentos por mês"
                  height="10rem"
                  chart={aferese}
                />
              </Grid>
              <Grid item xs={12} md={12} mb={0}>
                <AlarmFrequencyChart
                  icon={{ color: "error", component: "warning" }}
                  title="Top 10 Alarmes"
                  description="Frequência nos últimos"
                  height="15rem"
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={4}>
            <MDBox mb={3}>
              <UncollectedComponents />
            </MDBox>
            <LastDonations />
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default Trima;
