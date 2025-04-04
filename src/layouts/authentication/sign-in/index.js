import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Authentication layout components
import BasicLayout from "layouts/authentication/components/BasicLayout";

// background Images
import bgImage1 from "assets/images/background/1.jpg";
import bgImage2 from "assets/images/background/2.jpg";
import bgImage3 from "assets/images/background/3.jpg";
import bgImage4 from "assets/images/background/4.jpg";
import bgImage5 from "assets/images/background/5.jpg";

function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");

  useEffect(() => {
    const images = [bgImage1, bgImage2, bgImage3, bgImage4, bgImage5];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    setBackgroundImage(randomImage);
  }, []); // Executa apenas uma vez quando o componente é montado

  const handleSetRememberMe = () => setRememberMe(!rememberMe);
  const apiUrl = process.env.REACT_APP_API_URL;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    console.log("Tentando fazer login com:", { username, password }); // Log dos dados de entrada

    try {
      const response = await axios.post(`${apiUrl}/api/auth/signin`, {
        username,
        password,
      });
      console.log("Resposta do servidor:", response.data); // Log da resposta do servidor

      // Armazenar o token e o nome completo do usuário no localStorage
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("userName", `${response.data.user.firstName}`); // Armazenando o nome completo

      navigate("/dashboard");
    } catch (err) {
      console.error("Erro ao fazer login:", err); // Log do erro
      setError(err.response?.data?.error || "Erro ao fazer login");
    }
  };

  // Efeito para verificar o parâmetro "out" na URL
  useEffect(() => {
    console.log("Verificando parâmetros da URL..."); // Log para verificar se o efeito está sendo chamado
    const params = new URLSearchParams(location.search);
    if (params.has("out")) {
      localStorage.removeItem("authToken"); // Remove o token do localStorage
      console.log("Token removido devido ao logout."); // Log para verificar a remoção do token
    } else {
      console.log("Parâmetro 'out' não encontrado."); // Log se o parâmetro não estiver presente
    }
  }, [location.search]); // Executa o efeito sempre que a localização mudar

  return (
    <BasicLayout image={backgroundImage}>
      <Card>
        <MDBox
          variant="gradient"
          bgColor="info"
          borderRadius="lg"
          coloredShadow="info"
          mx={2}
          mt={-3}
          p={2}
          mb={1}
          textAlign="center"
        >
          <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
            TOMEs Track
          </MDTypography>
        </MDBox>
        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form" onSubmit={handleSignIn}>
            <MDBox mb={2}>
              <MDInput
                type="text"
                label="Nome de Usuário"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </MDBox>
            <MDBox mb={2}>
              <MDInput
                type="password"
                label="Senha"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </MDBox>
            {error && <MDTypography color="error">{error}</MDTypography>}
            <MDBox mt={4} mb={1}>
              <MDButton variant="gradient" color="info" fullWidth type="submit">
                Acessar
              </MDButton>
            </MDBox>
            <MDBox mt={3} mb={1} textAlign="center">
              <MDTypography variant="button" color="text">
                Não tem conta? Faça o cadastro no TOMEs
              </MDTypography>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default SignIn;

/*


*/
