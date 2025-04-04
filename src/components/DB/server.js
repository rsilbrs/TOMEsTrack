require("dotenv").config({ path: "./src/components/DB/.env" }); // Ajuste caso o .env esteja em uma pasta específica
console.log(process.env.DB_USER); // Verifique se a variável DB_USER está sendo carregada
console.log(process.env.DB_PASS); // Verifique se a variável DB_PASS está sendo carregada
console.log(process.env.DB_SERVER); // Verifique se a variável DB_SERVER está sendo carregada
console.log(process.env.DB_NAME); // Verifique se a variável DB_NAME está sendo carregada

const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors());

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { encrypt: false },
};

// Rota para buscar dados do banco
app.get("/dadosGrafico", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(
      "SELECT [SessionDataId] ,[Yield] ,[StartTime] FROM [TOMEs_DB].[dbo].[TrimaViewData]"
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar o servidor
const PORT = 8000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
