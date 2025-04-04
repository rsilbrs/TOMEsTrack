import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("authToken");

  // Se não houver token, redireciona para sign-in
  return token ? <Outlet /> : <Navigate to="/authentication/sign-in" replace />;
};

export default ProtectedRoute;
