const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const authenticateToken = require("../middleware/auth");
const nodemailer = require("nodemailer");
const { generateEmailContent } = require("../cron/notificationScheduler");

// Constantes para caminhos
const NOTIFICATIONS_DIR = path.join(__dirname, "../data");
const NOTIFICATIONS_FILE = path.join(NOTIFICATIONS_DIR, "notification_settings.json");
const EMAIL_TEMPLATES_FILE = path.join(NOTIFICATIONS_DIR, "email_templates.json");
const BACKUP_DIR = path.join(NOTIFICATIONS_DIR, "backups");

// Função para verificar e corrigir permissões de arquivo
const ensureFilePermissions = async (filePath) => {
  try {
    // Verificar se o arquivo existe
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log(`Arquivo ${filePath} não existe. Criando com permissões corretas...`);
        // Criar arquivo vazio com permissões 644 (rw-r--r--)
        await fs.writeFile(filePath, "{}", { mode: 0o644 });
        return;
      }
      throw error;
    }

    // Tentar ler o arquivo para verificar permissões
    try {
      await fs.readFile(filePath);
    } catch (error) {
      console.error(`Erro ao ler arquivo ${filePath}:`, error);

      // Se for erro de permissão, tentar corrigir
      if (error.code === "EACCES") {
        console.log(`Corrigindo permissões do arquivo ${filePath}...`);
        try {
          // Alterar permissões para 644 (rw-r--r--)
          await fs.chmod(filePath, 0o644);
          console.log(`Permissões corrigidas com sucesso para ${filePath}`);
        } catch (chmodError) {
          console.error(`Erro ao corrigir permissões:`, chmodError);
          throw new Error(`Não foi possível corrigir permissões do arquivo ${filePath}`);
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`Erro ao verificar permissões do arquivo ${filePath}:`, error);
    throw error;
  }
};

// Função para garantir que todos os diretórios necessários existam
const ensureAllDirectories = async () => {
  const directories = [NOTIFICATIONS_DIR, BACKUP_DIR];

  for (const dir of directories) {
    try {
      await fs.access(dir);
      console.log(`Diretório ${dir} existe.`);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log(`Criando diretório ${dir}...`);
        await fs.mkdir(dir, { recursive: true, mode: 0o755 });
        console.log(`Diretório ${dir} criado com sucesso.`);
      } else {
        throw error;
      }
    }
  }
};

// Função para criar backup do arquivo
const createBackup = async (filePath) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = path.basename(filePath, ".json");
    const backupPath = path.join(BACKUP_DIR, `${fileName}_${timestamp}.json`);

    await fs.copyFile(filePath, backupPath);
    console.log(`Backup criado em ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Erro ao criar backup: ${error.message}`);
    return false;
  }
};

// Função para salvar configurações
const saveSettings = async (filePath, data) => {
  try {
    // Garantir que o diretório existe
    await ensureAllDirectories();

    // Verificar se o arquivo existe
    let existingData = {};
    try {
      const fileContent = await fs.readFile(filePath, "utf8");
      existingData = JSON.parse(fileContent);
    } catch (error) {
      // Se o arquivo não existe ou está corrompido, começa com objeto vazio
      console.log(`Criando novo arquivo ${filePath}`);
    }

    // Atualizar os dados existentes com os novos dados
    const updatedData = { ...existingData, ...data };

    // Salvar diretamente no arquivo
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), { mode: 0o644 });
    console.log(`Configurações salvas com sucesso em ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Erro ao salvar configurações em ${filePath}:`, error);
    throw error;
  }
};

// Middleware para garantir autenticação
router.use(authenticateToken);

// Obter configurações de notificações
router.get("/settings", async (req, res) => {
  try {
    const username = req.user.username;
    console.log(`Obtendo configurações para o usuário ${username}`);

    try {
      await ensureAllDirectories();
    } catch (error) {
      console.error("Erro ao verificar diretório/arquivo:", error);
      return res.status(500).json({ error: "Erro ao acessar arquivo de configurações" });
    }

    try {
      // Lê o conteúdo do arquivo
      const fileContent = await fs.readFile(NOTIFICATIONS_FILE, "utf8");
      let settings;

      try {
        settings = JSON.parse(fileContent);
      } catch (parseError) {
        console.error("Erro ao analisar JSON:", parseError);
        // Se o JSON estiver corrompido, retorna configurações vazias
        return res.json(null);
      }

      // Filtra configurações pelo usuário
      const userSettings = settings[username] || null;
      res.json(userSettings);
    } catch (error) {
      console.error("Erro ao ler configurações:", error);
      res.status(500).json({ error: "Erro ao ler configurações" });
    }
  } catch (error) {
    console.error("Erro ao processar requisição:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Salvar configurações de notificações
router.post("/settings", async (req, res) => {
  try {
    const username = req.user.username;
    const notificationSettings = req.body;

    console.log(`Salvando configurações para o usuário ${username}`);

    // Adiciona o nome de usuário e timestamp às configurações
    notificationSettings.username = username;
    notificationSettings.lastUpdated = new Date().toISOString();

    // Carregar configurações existentes
    let existingSettings = {};
    try {
      const fileContent = await fs.readFile(NOTIFICATIONS_FILE, "utf8");
      existingSettings = JSON.parse(fileContent);
    } catch (error) {
      // Se houver erro ao ler, começa com objeto vazio
      existingSettings = {};
    }

    // Atualizar as configurações do usuário
    existingSettings[username] = notificationSettings;

    // Salvar as configurações
    await saveSettings(NOTIFICATIONS_FILE, existingSettings);

    res.json({
      success: true,
      message: "Configurações salvas com sucesso",
      settings: notificationSettings,
    });
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    res.status(500).json({
      error: "Erro ao salvar configurações",
      details: error.message,
    });
  }
});

// Obter todas as configurações (para administração)
router.get("/settings/all", async (req, res) => {
  try {
    // Verifica se o usuário é administrador (implementar lógica específica conforme necessário)
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso não autorizado" });
    }

    try {
      await ensureAllDirectories();
    } catch (error) {
      console.error("Erro ao verificar diretório/arquivo:", error);
      return res.status(500).json({ error: "Erro ao acessar arquivo de configurações" });
    }

    try {
      // Lê o conteúdo do arquivo
      const fileContent = await fs.readFile(NOTIFICATIONS_FILE, "utf8");
      let settings;

      try {
        settings = JSON.parse(fileContent);
        res.json(settings);
      } catch (parseError) {
        console.error("Erro ao analisar JSON:", parseError);
        res.json({});
      }
    } catch (error) {
      console.error("Erro ao ler todas as configurações:", error);
      res.status(500).json({ error: "Erro ao ler configurações" });
    }
  } catch (error) {
    console.error("Erro ao processar requisição:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota para testar o envio de notificações
router.post("/test-send", async (req, res) => {
  try {
    // Verificar se o usuário tem permissão para testar
    // (opcional: implementar uma verificação de perfil/permissão)

    // Carregar o módulo de agendamento
    const notificationScheduler = require("../cron/notificationScheduler");

    // Executar o envio de notificações
    await notificationScheduler.sendNotificationEmails();

    res.json({ message: "Teste de envio de notificações iniciado com sucesso" });
  } catch (error) {
    console.error("Erro ao executar teste de notificações:", error);
    res.status(500).json({ error: "Erro ao executar teste de notificações" });
  }
});

// Rota para testar apenas a configuração do email
router.post("/test-email", async (req, res) => {
  try {
    const { email, frequency, indicators } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email não fornecido" });
    }

    // Configurações do email
    const emailConfig = {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      requireTLS: false,
      auth: {
        user: process.env.EMAIL_USER || "user@example.com",
        pass: process.env.EMAIL_PASSWORD || "password",
      },
    };

    // Verificar se as credenciais estão definidas
    if (
      !emailConfig.auth.user ||
      !emailConfig.auth.pass ||
      emailConfig.auth.user === "user@example.com"
    ) {
      return res.status(500).json({
        error: "Configuração de email incompleta",
        details: "As credenciais de email não estão configuradas corretamente no servidor.",
      });
    }

    // Criar transportador de email
    const transporter = nodemailer.createTransport(emailConfig);

    try {
      // Verificar a conexão com o servidor de email
      await transporter.verify();
      console.log("Conexão com servidor de email verificada com sucesso.");
    } catch (verifyError) {
      console.error("Erro na verificação do servidor de email:", verifyError);
      return res.status(500).json({
        error: "Erro na conexão com servidor de email",
        details: verifyError.message,
      });
    }

    let emailContent;

    // Gerar conteúdo do email (com dados reais ou simulados)
    if (indicators) {
      // Usar os dados reais selecionados pelo usuário
      const userSettings = {
        email,
        frequency: frequency || "weekly",
        dashboardIndicators: indicators.dashboardIndicators || {},
        trimaIndicators: indicators.trimaIndicators || {},
        reveosIndicators: indicators.reveosIndicators || {},
      };

      try {
        emailContent = await generateEmailContent(userSettings);
      } catch (contentError) {
        console.error("Erro ao gerar conteúdo do email:", contentError);
        return res.status(500).json({
          error: "Erro ao gerar conteúdo do email",
          details: contentError.message,
        });
      }
    } else {
      // Gerar um email de teste simples sem dados
      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Teste de Email</title>
        </head>
        <body>
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background-color: #2c70b8; color: white; padding: 20px; text-align: center;">
              <h1>Teste de Email - Dashboard</h1>
            </div>
            <div style="padding: 20px; background-color: #f8f8f8; border: 1px solid #ddd;">
              <p>Olá,</p>
              <p>Este é um email de teste enviado pelo Dashboard.</p>
              <p>Sua configuração de email está funcionando corretamente!</p>
              <p>Frequência selecionada: <strong>${frequency || "Semanal"}</strong></p>
              <p>Nenhum indicador foi selecionado para este teste.</p>
              <hr>
              <p style="font-size: 12px; color: #777;">
                Este é um email automático, por favor não responda.<br>
                © ${new Date().getFullYear()} Dashboard - Todos os direitos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    try {
      // Enviar o email de teste
      const info = await transporter.sendMail({
        from: `"Dashboard - Teste" <${emailConfig.auth.user}>`,
        to: email,
        subject: "Teste de Email - Dashboard",
        html: emailContent,
      });

      console.log(`Email de teste enviado com sucesso para ${email}. ID: ${info.messageId}`);

      res.json({
        success: true,
        message: "Email de teste enviado com sucesso",
        messageId: info.messageId,
      });
    } catch (sendError) {
      console.error("Erro ao enviar email:", sendError);
      res.status(500).json({
        error: "Erro ao enviar email de teste",
        details: sendError.message,
      });
    }
  } catch (error) {
    console.error("Erro ao processar teste de email:", error);
    res.status(500).json({
      error: "Erro ao enviar email de teste",
      details: error.message,
    });
  }
});

// Rota para verificar a configuração atual do email (sem expor a senha)
router.get("/email-config", async (req, res) => {
  try {
    // Verificar permissões (opcional)

    // Retornar configurações do email (exceto senha)
    res.json({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      requireTLS: process.env.EMAIL_REQUIRE_TLS === "true",
      user: process.env.EMAIL_USER || "user@example.com",
      passwordLength: process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0,
      // Mostra apenas o formato da senha (com X no lugar dos caracteres)
      passwordFormat: process.env.EMAIL_PASSWORD
        ? process.env.EMAIL_PASSWORD.replace(/./g, "X")
        : "",
    });
  } catch (error) {
    console.error("Erro ao obter configuração de email:", error);
    res.status(500).json({ error: "Erro ao obter configuração de email" });
  }
});

// Rota para obter templates de email disponíveis
router.get("/email-templates", async (req, res) => {
  try {
    // Verificar se o diretório existe
    await ensureAllDirectories();

    // Tentar carregar o arquivo de templates
    try {
      await fs.access(EMAIL_TEMPLATES_FILE);
    } catch (error) {
      // Criar o arquivo com templates padrão se não existir
      const defaultTemplates = {
        default: {
          name: "Padrão",
          description: "Template padrão do sistema com design moderno e responsivo",
          color: "#2c70b8",
          accent: "#5e72e4",
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          isDefault: true,
        },
        minimal: {
          name: "Minimalista",
          description: "Template com design clean e minimalista",
          color: "#4a4a4a",
          accent: "#2c2c2c",
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          isDefault: false,
        },
        dark: {
          name: "Dark Mode",
          description: "Template com esquema de cores escuras",
          color: "#1a1a1a",
          accent: "#3a3a3a",
          backgroundColor: "#121212",
          textColor: "#f5f5f5",
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          isDefault: false,
        },
      };

      await fs.writeFile(EMAIL_TEMPLATES_FILE, JSON.stringify(defaultTemplates, null, 2), "utf8");
      console.log("Arquivo de templates criado com padrões");
    }

    // Ler o arquivo de templates
    const fileContent = await fs.readFile(EMAIL_TEMPLATES_FILE, "utf8");
    const templates = JSON.parse(fileContent);

    // Retornar para o cliente
    res.json(templates);
  } catch (error) {
    console.error("Erro ao obter templates de email:", error);
    res.status(500).json({ error: "Erro ao obter templates de email" });
  }
});

// Rota para adicionar ou atualizar um template de email
router.post("/email-templates", async (req, res) => {
  try {
    const { name, templateId, template } = req.body;

    if (!name || !templateId || !template) {
      return res.status(400).json({ error: "Dados incompletos para salvar o template" });
    }

    // Verificar se o diretório existe
    await ensureAllDirectories();

    // Carregar templates existentes
    let templates = {};
    try {
      const fileContent = await fs.readFile(EMAIL_TEMPLATES_FILE, "utf8");
      templates = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Erro ao ler arquivo de templates:", error);
        return res.status(500).json({ error: "Erro ao ler arquivo de templates" });
      }
      // Se o arquivo não existir, continua com objeto vazio
    }

    // Verificar se está querendo atualizar o template padrão
    if (templateId === "default" && templates.default && templates.default.isDefault) {
      // Criar uma cópia do template padrão com outro nome
      const newTemplateId = `custom_${Date.now()}`;
      template.name = `${name} (Personalizado)`;
      template.isDefault = false;
      template.basedOn = "default";
      template.created = new Date().toISOString();
      template.lastUpdated = new Date().toISOString();

      templates[newTemplateId] = template;

      await saveSettings(EMAIL_TEMPLATES_FILE, templates);

      return res.json({
        success: true,
        message: "Criado novo template personalizado baseado no padrão",
        templateId: newTemplateId,
        template: templates[newTemplateId],
      });
    }

    // Atualizar ou criar o template
    template.lastUpdated = new Date().toISOString();
    if (!templates[templateId]) {
      template.created = new Date().toISOString();
    }

    templates[templateId] = template;

    // Salvar no arquivo
    await saveSettings(EMAIL_TEMPLATES_FILE, templates);

    res.json({
      success: true,
      message: "Template salvo com sucesso",
      templateId,
      template: templates[templateId],
    });
  } catch (error) {
    console.error("Erro ao salvar template de email:", error);
    res.status(500).json({ error: "Erro ao salvar template de email" });
  }
});

// Rota para excluir um template de email
router.delete("/email-templates/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({ error: "ID do template não fornecido" });
    }

    // Não permitir excluir o template padrão
    if (templateId === "default") {
      return res.status(403).json({ error: "Não é permitido excluir o template padrão" });
    }

    // Carregar templates existentes
    let templates = {};
    try {
      const fileContent = await fs.readFile(EMAIL_TEMPLATES_FILE, "utf8");
      templates = JSON.parse(fileContent);
    } catch (error) {
      return res.status(404).json({ error: "Arquivo de templates não encontrado" });
    }

    // Verificar se o template existe
    if (!templates[templateId]) {
      return res.status(404).json({ error: "Template não encontrado" });
    }

    // Remover o template
    delete templates[templateId];

    // Salvar no arquivo
    await saveSettings(EMAIL_TEMPLATES_FILE, templates);

    res.json({ success: true, message: "Template excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir template de email:", error);
    res.status(500).json({ error: "Erro ao excluir template de email" });
  }
});

// Rota para verificar status do agendador de notificações
router.get("/scheduler-status", async (req, res) => {
  try {
    // Verificar as configurações atuais
    try {
      await ensureAllDirectories();
    } catch (error) {
      console.error("Erro ao verificar diretório/arquivo:", error);
      return res.status(500).json({ error: "Erro ao acessar arquivo de configurações" });
    }

    // Verificar o próximo horário de execução
    const now = new Date();
    let nextExecution = new Date(now);
    nextExecution.setHours(7, 0, 0, 0); // 7h da manhã

    // Se já passou das 7h, próxima execução será amanhã
    if (now.getHours() >= 7) {
      nextExecution.setDate(nextExecution.getDate() + 1);
    }

    // Carregar todas as configurações para contar quantos usuários estão agendados
    let usersCount = 0;
    let dailyCount = 0;
    let weeklyCount = 0;
    let monthlyCount = 0;

    try {
      const fileContent = await fs.readFile(NOTIFICATIONS_FILE, "utf8");
      const settings = JSON.parse(fileContent);

      // Contar por tipo de frequência
      Object.values(settings).forEach((userSetting) => {
        if (userSetting && userSetting.email) {
          usersCount++;

          switch (userSetting.frequency) {
            case "daily":
              dailyCount++;
              break;
            case "weekly":
              weeklyCount++;
              break;
            case "monthly":
              monthlyCount++;
              break;
          }
        }
      });
    } catch (error) {
      console.error("Erro ao ler configurações:", error);
      // Continuar mesmo com erro para pelo menos retornar informações parciais
    }

    // Verificar usuários que receberão na próxima execução
    let nextExecutionCount = 0;

    // Verificar se amanhã é início da semana (segunda-feira) ou do mês (dia 1)
    const tomorrow = new Date(nextExecution);
    const isMonday = tomorrow.getDay() === 1; // 0 (Domingo) a 6 (Sábado), 1 = Segunda
    const isFirstDayOfMonth = tomorrow.getDate() === 1;

    // Todos os diários + semanais (se for segunda) + mensais (se for dia 1)
    nextExecutionCount = dailyCount;
    if (isMonday) nextExecutionCount += weeklyCount;
    if (isFirstDayOfMonth) nextExecutionCount += monthlyCount;

    // Preparar resposta
    const response = {
      status: "active",
      nextExecution: nextExecution.toISOString(),
      nextExecutionFormatted: nextExecution.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      usersCount,
      countByFrequency: {
        daily: dailyCount,
        weekly: weeklyCount,
        monthly: monthlyCount,
      },
      nextExecutionCount,
      isSpecialDay: {
        isMonday,
        isFirstDayOfMonth,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Erro ao obter status do agendador:", error);
    res.status(500).json({ error: "Erro ao obter status do agendador" });
  }
});

// Rota para forçar o envio de notificações (apenas para testes/depuração)
router.post("/force-send", async (req, res) => {
  try {
    // Verificar se o usuário tem permissão para forçar o envio
    // Esta verificação pode ser personalizada conforme as regras de permissão específicas
    if (req.user.role !== "admin" && req.user.username !== "admin") {
      return res
        .status(403)
        .json({ error: "Permissão negada. Apenas administradores podem forçar o envio." });
    }

    // Parâmetros opcionais para filtrar quais usuários receberão as notificações
    const { userId, testEmail, dryRun } = req.body;

    // Carregar o módulo de agendamento
    const notificationScheduler = require("../cron/notificationScheduler");

    // Executar o envio com parâmetros opcionais
    const result = await notificationScheduler.sendNotificationEmails({
      specificUserId: userId,
      testEmail,
      dryRun: Boolean(dryRun),
    });

    res.json({
      success: true,
      message: `Envio de notificações ${dryRun ? "simulado" : "iniciado"} com sucesso`,
      details: result,
    });
  } catch (error) {
    console.error("Erro ao forçar envio de notificações:", error);
    res.status(500).json({ error: "Erro ao forçar envio de notificações", details: error.message });
  }
});

// Rota para exportar configurações do usuário atual
router.get("/export-config", async (req, res) => {
  try {
    const username = req.user.username;

    // Garantir que o diretório existe
    await ensureAllDirectories();

    // Carregar configurações
    let userSettings = null;
    try {
      const fileContent = await fs.readFile(NOTIFICATIONS_FILE, "utf8");
      const settings = JSON.parse(fileContent);

      // Obter configurações do usuário
      userSettings = settings[username];

      if (!userSettings) {
        return res.status(404).json({ error: "Nenhuma configuração encontrada para este usuário" });
      }

      // Remover informações sensíveis ou desnecessárias para exportação
      const exportConfig = { ...userSettings };
      exportConfig.exportDate = new Date().toISOString();
      exportConfig.exportedBy = username;

      // Adicionar cabeçalho para download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="notification_config_${username}_${Date.now()}.json"`
      );
      res.setHeader("Content-Type", "application/json");

      // Enviar o arquivo
      res.json(exportConfig);
    } catch (error) {
      console.error("Erro ao exportar configurações:", error);
      res.status(500).json({ error: "Erro ao exportar configurações" });
    }
  } catch (error) {
    console.error("Erro ao processar exportação:", error);
    res.status(500).json({ error: "Erro ao processar exportação" });
  }
});

// Rota para importar configurações
router.post("/import-config", async (req, res) => {
  try {
    const username = req.user.username;
    const configToImport = req.body;

    if (
      !configToImport ||
      !configToImport.dashboardIndicators ||
      !configToImport.trimaIndicators ||
      !configToImport.reveosIndicators
    ) {
      return res.status(400).json({ error: "Formato de configuração inválido ou incompleto" });
    }

    // Garantir que o diretório existe
    await ensureAllDirectories();

    // Carregar configurações existentes
    let settings = {};
    try {
      const fileContent = await fs.readFile(NOTIFICATIONS_FILE, "utf8");
      settings = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Erro ao ler configurações existentes:", error);
        return res.status(500).json({ error: "Erro ao ler configurações existentes" });
      }
      // Se o arquivo não existir, continua com objeto vazio
    }

    // Preparar os dados para importação
    const importedConfig = {
      email: configToImport.email || "",
      frequency: configToImport.frequency || "weekly",
      dashboardIndicators: configToImport.dashboardIndicators || {},
      trimaIndicators: configToImport.trimaIndicators || {},
      reveosIndicators: configToImport.reveosIndicators || {},
      emailTemplate: configToImport.emailTemplate || "default",
      lastUpdated: new Date().toISOString(),
      username: username,
      importedAt: new Date().toISOString(),
      importedFrom: configToImport.exportedBy || "unknown",
    };

    // Atualizar as configurações do usuário
    settings[username] = importedConfig;

    // Salvar as configurações
    try {
      await saveSettings(NOTIFICATIONS_FILE, settings);

      res.json({
        success: true,
        message: "Configurações importadas com sucesso",
        config: importedConfig,
      });
    } catch (writeError) {
      console.error("Erro ao salvar configurações importadas:", writeError);
      res.status(500).json({ error: "Erro ao salvar configurações importadas" });
    }
  } catch (error) {
    console.error("Erro ao processar importação:", error);
    res.status(500).json({ error: "Erro ao processar importação de configurações" });
  }
});

module.exports = router;
