// Material Dashboard 2 React layouts
import Dashboard from "layouts/dashboard";
import { useNavigate } from "react-router-dom"; // Importar useNavigate
import Icon from "@mui/material/Icon";

// Pages
import Trima from "layouts/trima";
import Reveos from "layouts/reveos";
import Example from "layouts/tables";
import TrimaReport from "layouts/reports/TrimaReport";
import ReveosReport from "layouts/reports/ReveosReport";

// Examples
import Tables from "layouts/tables";
import Profile from "layouts/profile";
import Notifications from "layouts/notifications";
import SignIn from "layouts/authentication/sign-in";

// @mui icons
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

// Custom Icons
import ReveosIcon from "components/CustomIcons/Reveos";
import TRACIcon from "components/CustomIcons/TRAC";
import TrimaIcon from "components/CustomIcons/Trima";
import ArchimedeIcon from "components/CustomIcons/Archimede";

// Componente inline para Logout
const LogoutItem = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("authToken"); // Destrói o token
    navigate("/authentication/sign-in", { replace: true }); // Redireciona
  };

  return (
    <Icon fontSize="small" onClick={handleLogout}>
      logout
    </Icon>
  );
};

const routes = [
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: <Dashboard />,
  },
  {
    type: "collapse",
    name: "Trima",
    key: "trima",
    icon: <TrimaIcon />,
    route: "/trima",
    component: <Trima />,
  },
  {
    type: "collapse",
    name: "Reveos",
    key: "reveos",
    icon: <ReveosIcon />,
    route: "/reveos",
    component: <Reveos />,
  },
  {
    type: "collapse",
    name: "Notificações",
    key: "notificacoes",
    icon: <NotificationsActiveIcon />,
    route: "/notifications",
    component: <Notifications />,
  },
  {
    type: "collapse",
    name: "Logout",
    key: "logout",
    icon: <Icon fontSize="small">logout</Icon>,
    route: "/authentication/sign-in?out",
  },
  {
    type: "hidden", // Tipo especial para rotas que não devem aparecer no menu
    name: "Trima Report",
    key: "trima-report",
    route: "/report/trima/:codigo",
    component: <TrimaReport />,
  },
  {
    type: "hidden",
    name: "Reveos Report",
    key: "reveos-report",
    route: "/report/reveos/:codigo",
    component: <ReveosReport />,
  },
];

export default routes;

/*

  {
    type: "collapse",
    name: "T-RAC",
    key: "trac",
    icon: <TRACIcon />,
    route: "/dashboard",
    component: <Trima />,
  },
  {
    type: "collapse",
    name: "Archimede",
    key: "archimede",
    icon: <ArchimedeIcon />,
    route: "/dashboard",
    component: <Trima />,
  },
*/
