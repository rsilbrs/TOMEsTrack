const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sql = require("mssql");

const app = express();

// Configuração do CORS
const corsOptions = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware de autenticação
const authenticateToken = require("./middleware/auth");

// Importação das rotas
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const reveosRoutes = require("./routes/reveos");
const trimaRoutes = require("./routes/trima");
const notificationsRoutes = require("./routes/notifications");

// Importar agendador de notificações
const notificationScheduler = require("./cron/notificationScheduler");

// Registro das rotas
app.use("/api/auth", authRoutes);

// Rota de teste (sem autenticação)
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Middleware de autenticação para todas as outras rotas
app.use("/api", authenticateToken);
app.use("/api", dashboardRoutes);
app.use("/api", reveosRoutes);
app.use("/api", trimaRoutes);
app.use("/api/notifications", notificationsRoutes);

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Erro interno do servidor",
    details: err.message,
  });
});

const PORT = process.env.PORT || 8001;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);

  // Iniciar o agendador de notificações
  notificationScheduler.startScheduler();
});
