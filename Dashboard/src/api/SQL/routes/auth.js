const express = require("express");
const sql = require("mssql");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Configuração do banco de dados
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Função para verificar a senha
function verifyPassword(storedHash, storedSalt, providedPassword) {
  const hash = crypto
    .createHash("sha256")
    .update(providedPassword + storedSalt)
    .digest("hex");
  return hash === storedHash;
}

// Rota de autenticação
router.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Nome de usuário e senha são obrigatórios." });
  }

  try {
    await sql.connect(config);
    const request = new sql.Request();
    request.input("username", sql.VarChar, username);
    const result = await request.query(`
      SELECT [USER_NAME], [FIRST_NAME], [LAST_NAME], [PASSWORD_HASH], [PASSWORD_SALT]
      FROM [TOMEs_DB].[dbo].[Users]
      WHERE [USER_NAME] = @username
    `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado." });
    }

    const user = result.recordset[0];
    const isPasswordValid = verifyPassword(user.PASSWORD_HASH, user.PASSWORD_SALT, password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    const token = jwt.sign({ username: user.USER_NAME }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Autenticação bem-sucedida",
      token,
      user: { username: user.USER_NAME, firstName: user.FIRST_NAME, lastName: user.LAST_NAME },
    });
  } catch (error) {
    console.error("Erro ao processar a requisição:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

module.exports = router;
