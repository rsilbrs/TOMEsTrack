// @mui material components
import Grid from "@mui/material/Grid";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Charts
import VerticalBarChart from "examples/Charts/BarCharts/VerticalBarChart";
import DefaultLineChart from "examples/Charts/LineCharts/DefaultLineChart";

// Data
import totalAferese from "layouts/dashboard/data/totalAferese";
import totalSangueTotal from "layouts/dashboard/data/totalSangueTotal";
import componentesTipo from "layouts/dashboard/data/componentesTipo";

// Dashboard components
import Productivity from "layouts/dashboard/components/Productivity";
import Production from "layouts/dashboard/components/Production";

function Dashboard() {
  const aferese = totalAferese();
  const sangueTotal = totalSangueTotal();
  const componentesData = componentesTipo();

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "leaderboard" }}
                  title="Total de doações por Aféreses"
                  description="Procedimentos por mês"
                  height="8rem"
                  chart={aferese}
                />
              </MDBox>
              <MDBox mb={3}>
                <VerticalBarChart
                  icon={{ color: "dark", component: "leaderboard" }}
                  title="Total de doações por Sangue Total"
                  description="Doações por mês"
                  height="8rem"
                  chart={sangueTotal}
                />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={8}>
              <MDBox mb={3}>
                <DefaultLineChart
                  icon={{ color: "dark", component: "leaderboard" }}
                  title="Total de Componentes Produzidos"
                  description="Produção por componente por mês"
                  height="23rem"
                  chart={componentesData}
                />
              </MDBox>
            </Grid>
          </Grid>
        </MDBox>
        <MDBox>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={8}>
              <Productivity />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <Production />
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Dashboard;
