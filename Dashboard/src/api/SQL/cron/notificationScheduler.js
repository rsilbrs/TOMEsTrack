const cron = require("node-cron");
const fs = require("fs").promises;
const path = require("path");
const nodemailer = require("nodemailer");
const sql = require("mssql");
const config = require("../config/database");

// Caminho para o arquivo de configurações de notificações
const NOTIFICATIONS_FILE = path.join(__dirname, "../data/notification_settings.json");
const EMAIL_TEMPLATES_FILE = path.join(__dirname, "../data/email_templates.json");

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

// Log das configurações (sem a senha por segurança)
console.log("Configurações de email do agendador:", {
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  requireTLS: emailConfig.requireTLS,
  user: emailConfig.auth.user,
});

// Cria transportador de email
const transporter = nodemailer.createTransport(emailConfig);

// Função para ajustar a cor (tornar mais escura ou mais clara)
function adjustColor(color, amount) {
  // Remover o # do início, se existir
  color = color.replace(/^#/, "");

  // Converter para valores RGB
  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);

  // Ajustar cada componente
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));

  // Converter de volta para formato hexadecimal
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Função para ler as configurações de notificações
async function getNotificationSettings() {
  try {
    // Verificar se o arquivo existe
    try {
      await fs.access(NOTIFICATIONS_FILE);

      // Ler o conteúdo do arquivo
      const fileContent = await fs.readFile(NOTIFICATIONS_FILE, "utf8");
      console.log(`Lidas configurações de notificações, tamanho: ${fileContent.length} bytes`);

      try {
        // Tentar fazer parse do JSON
        const settings = JSON.parse(fileContent);

        // Verificar se o resultado é um objeto válido
        if (settings && typeof settings === "object") {
          return settings;
        } else {
          console.error("Arquivo de configurações não contém um objeto JSON válido");
          return {};
        }
      } catch (parseError) {
        console.error("Erro ao fazer parse do JSON de configurações:", parseError);
        console.log("Criando um arquivo de backup antes de reiniciar");

        // Criar backup do arquivo corrompido
        const backupPath = `${NOTIFICATIONS_FILE}.corrupted.${Date.now()}`;
        await fs.writeFile(backupPath, fileContent, "utf8");
        console.log(`Backup do arquivo corrompido criado em ${backupPath}`);

        // Criar um novo arquivo vazio
        await fs.writeFile(NOTIFICATIONS_FILE, "{}", "utf8");
        console.log("Novo arquivo de configurações vazio criado");

        return {};
      }
    } catch (accessError) {
      if (accessError.code === "ENOENT") {
        console.log("Arquivo de configurações não encontrado, criando um novo");

        // Garantir que o diretório exista
        const dir = path.dirname(NOTIFICATIONS_FILE);
        try {
          await fs.mkdir(dir, { recursive: true });
        } catch (mkdirError) {
          console.error("Erro ao criar diretório para configurações:", mkdirError);
        }

        // Criar um novo arquivo vazio
        await fs.writeFile(NOTIFICATIONS_FILE, "{}", "utf8");
        console.log("Novo arquivo de configurações vazio criado");
      } else {
        console.error("Erro ao acessar arquivo de configurações:", accessError);
      }
      return {};
    }
  } catch (error) {
    console.error("Erro ao ler configurações de notificações:", error);
    return {};
  }
}

// Função para verificar se é dia de enviar email
function shouldSendEmail(frequency, today) {
  switch (frequency) {
    case "daily":
      return true; // Todos os dias
    case "weekly":
      return today.getDay() === 1; // Segunda-feira (0 = Domingo, 1 = Segunda, etc.)
    case "monthly":
      return today.getDate() === 1; // Dia 1 do mês
    default:
      return false;
  }
}

// Função para buscar dados de um indicador específico
async function getIndicatorData(indicator, startDate, endDate) {
  let pool;
  try {
    pool = await sql.connect(config);
    let query = "";
    let params = {};

    // Definir a consulta SQL com base no indicador
    switch (indicator) {
      // Dashboard indicators
      case "doacoesPorAfereses":
        query = `
          SELECT
            YEAR(StartTime) AS Ano,
            MONTH(StartTime) AS Mes,
            COUNT(*) AS Valor
          FROM [TOMEs_DB].[dbo].[TrimaViewData]
          WHERE StartTime BETWEEN @startDate AND @endDate
          GROUP BY YEAR(StartTime), MONTH(StartTime)
          ORDER BY Ano, Mes
        `;
        break;
      case "doacoesPorSangueTotal":
        query = `
          SELECT 
            YEAR(RunDateTime) AS Ano,
            MONTH(RunDateTime) AS Mes,
            COUNT(DonationId) AS Valor
          FROM [TOMEsReveosDimDb].[dbo].[DimDonations]
          WHERE 
            DonationId IS NOT NULL
            AND RunDateTime BETWEEN @startDate AND @endDate
          GROUP BY YEAR(RunDateTime), MONTH(RunDateTime)
          ORDER BY Ano, Mes
        `;
        break;
      case "componentesProduzidos":
        query = `
          SELECT 
            Ano,
            Mes,
            (SUM(PlaquetasAferese) + SUM(PlaquetasST) + 
             SUM(HemaciasAferese) + SUM(HemaciasST) + 
             SUM(PlasmaAferese) + SUM(PlasmaST)) AS Valor
          FROM (
            -- Dados do Trima
            SELECT 
              YEAR(StartTime) AS Ano,
              MONTH(StartTime) AS Mes,
              COUNT(CASE 
                WHEN ProcedureType LIKE '%PLT%' THEN 1 
                ELSE NULL 
              END) AS PlaquetasAferese,
              0 AS PlaquetasST,
              COUNT(CASE 
                WHEN ProcedureType LIKE '%RBC%' THEN 1 
                ELSE NULL 
              END) AS HemaciasAferese,
              0 AS HemaciasST,
              COUNT(CASE 
                WHEN ProcedureType LIKE '%PLASMA%' THEN 1 
                ELSE NULL 
              END) AS PlasmaAferese,
              0 AS PlasmaST
            FROM [TOMEs_DB].[dbo].[TrimaViewData]
            WHERE StartTime BETWEEN @startDate AND @endDate
            GROUP BY YEAR(StartTime), MONTH(StartTime)

            UNION ALL

            -- Dados do Reveos
            SELECT 
              YEAR(rd.StartDate) AS Ano,
              MONTH(rd.StartDate) AS Mes,
              0 AS PlaquetasAferese,
              SUM(CASE WHEN rdbp.PlateletVolume > 1 THEN 1 ELSE 0 END) AS PlaquetasST,
              0 AS HemaciasAferese,
              SUM(CASE WHEN rdbp.RbcPostfilterVolume > 1 THEN 1 ELSE 0 END) AS HemaciasST,
              0 AS PlasmaAferese,
              SUM(CASE WHEN rdbp.PlasmaVolume > 1 THEN 1 ELSE 0 END) AS PlasmaST
            FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] rdbp
            JOIN [TOMEsReveosDb].[dbo].[RunData] rd ON rd.Id = rdbp.Id
            WHERE rd.StartDate BETWEEN @startDate AND @endDate
            GROUP BY YEAR(rd.StartDate), MONTH(rd.StartDate)
          ) AS CombinedData
          GROUP BY Ano, Mes
          ORDER BY Ano, Mes
        `;
        break;
      case "produtividade":
        query = `
          WITH ProdutividadeAferese AS (
            SELECT 
              u.ID,
              COUNT(DISTINCT t.TIME) as TotalAferese
            FROM [TOMEs_DB].[dbo].[Users] u
            LEFT JOIN [TOMEs_DB].[dbo].[TrimaSessionEventResults] t 
            ON u.BARCODE = t.VALUE 
            AND t.CATEGORY = 'Operator ID'
            AND t.TIME BETWEEN @startDate AND @endDate
            GROUP BY u.ID
          ),
          ProdutividadeReveos AS (
            SELECT 
              u.ID,
              COUNT(*) as TotalReveos
            FROM [TOMEs_DB].[dbo].[Users] u
            LEFT JOIN [TOMEsReveosDb].[dbo].[RunDataDonations] r 
            ON u.USER_NAME = r.OperatorId
            WHERE (r.DonationStatus != 'CounterBalance' OR r.DonationStatus IS NULL)
            AND r.CreateDate BETWEEN @startDate AND @endDate
            GROUP BY u.ID
          )
          SELECT 
            YEAR(@endDate) AS Ano,
            MONTH(@endDate) AS Mes,
            COUNT(CASE WHEN ISNULL(pa.TotalAferese, 0) + ISNULL(pr.TotalReveos, 0) > 0 THEN 1 END) AS Valor
          FROM [TOMEs_DB].[dbo].[Users] u
          LEFT JOIN ProdutividadeAferese pa ON u.ID = pa.ID
          LEFT JOIN ProdutividadeReveos pr ON u.ID = pr.ID
        `;
        break;

      // Trima indicators
      case "plaquetasOfertadasColetadas":
        query = `
          WITH CollectedData AS (
            SELECT 
              YEAR([StartTime]) AS Ano,
              MONTH([StartTime]) AS Mes,
              SUM(CASE 
                WHEN [Yield] >= 3 AND [Yield] < 6 THEN 1
                WHEN [Yield] >= 6 AND [Yield] < 9 THEN 2
                WHEN [Yield] >= 9 AND [Yield] <= 12 THEN 3
                ELSE 0
              END) AS TotalComponentesColetados
            FROM [TOMEs_DB].[dbo].[TrimaViewData]
            WHERE [StartTime] BETWEEN @startDate AND @endDate
            GROUP BY YEAR([StartTime]), MONTH([StartTime])
          ),
          OfferedData AS (
            SELECT 
              YEAR(t.[StartTime]) AS Ano,
              MONTH(t.[StartTime]) AS Mes,
              SUM(CASE 
                WHEN CAST(JSON_VALUE(offer.Value, '$.PlateletYield') AS DECIMAL(10,2)) >= 3 
                  AND CAST(JSON_VALUE(offer.Value, '$.PlateletYield') AS DECIMAL(10,2)) < 6 THEN 1
                WHEN CAST(JSON_VALUE(offer.Value, '$.PlateletYield') AS DECIMAL(10,2)) >= 6 
                  AND CAST(JSON_VALUE(offer.Value, '$.PlateletYield') AS DECIMAL(10,2)) < 9 THEN 2
                WHEN CAST(JSON_VALUE(offer.Value, '$.PlateletYield') AS DECIMAL(10,2)) >= 9 
                  AND CAST(JSON_VALUE(offer.Value, '$.PlateletYield') AS DECIMAL(10,2)) <= 12 THEN 3
                ELSE 0
              END) AS TotalComponentesOferecidos
            FROM [TOMEs_DB].[dbo].[TrimaViewData] t
            CROSS APPLY OPENJSON(t.[ExtendedInfoProcedureSelections]) AS offer
            WHERE JSON_VALUE(offer.Value, '$.ProcedureType') = 'Offered'
              AND t.[StartTime] BETWEEN @startDate AND @endDate
            GROUP BY YEAR(t.[StartTime]), MONTH(t.[StartTime])
          )
          SELECT 
            COALESCE(c.Ano, o.Ano) AS Ano,
            COALESCE(c.Mes, o.Mes) AS Mes,
            CAST(CAST(ROUND(ISNULL(c.TotalComponentesColetados * 100.0 / 
              NULLIF(o.TotalComponentesOferecidos, 0), 0) AS INT) AS VARCHAR) + '%' AS Valor
          FROM CollectedData c
          FULL OUTER JOIN OfferedData o
            ON c.Ano = o.Ano AND c.Mes = o.Mes
          ORDER BY Ano, Mes
        `;
        break;
      case "plaquetasPreDoador":
        query = `
          SELECT 
            YEAR([StartTime]) AS Ano,
            MONTH([StartTime]) AS Mes,
            ROUND(AVG([DonorPreCount]), 0) AS Valor
          FROM [TOMEs_DB].[dbo].[TrimaViewData]
          WHERE [StartTime] BETWEEN @startDate AND @endDate
          GROUP BY YEAR([StartTime]), MONTH([StartTime])
          ORDER BY Ano, Mes
        `;
        break;
      case "htHbPreDoador":
        query = `
          SELECT 
            YEAR([StartTime]) AS Ano,
            MONTH([StartTime]) AS Mes,
            ROUND(AVG([DonorHematocrit]), 1) AS ValorHt,
            ROUND(AVG([DonorHemoglobin]), 1) AS ValorHb
          FROM [TOMEs_DB].[dbo].[TrimaViewData]
          WHERE [StartTime] BETWEEN @startDate AND @endDate
          GROUP BY YEAR([StartTime]), MONTH([StartTime])
          ORDER BY Ano, Mes
        `;
        break;
      case "duracaoProcedimentos":
        query = `
          SELECT 
            YEAR(StartTime) AS Ano,
            MONTH(StartTime) AS Mes,
            ROUND(AVG(CAST(DurationOfRun AS float) / 600000000), 0) AS Valor
          FROM [TOMEs_DB].[dbo].[TrimaViewData]
          WHERE StartTime BETWEEN @startDate AND @endDate
            AND DurationOfRun IS NOT NULL
          GROUP BY YEAR(StartTime), MONTH(StartTime)
          ORDER BY Ano, Mes
        `;
        break;
      case "top10Alarmes":
        query = `
          WITH TotalAlarmes AS (
            SELECT COUNT(*) AS TotalAlarms
            FROM [TOMEs_DB].[dbo].[TrimaViewData] t
            CROSS APPLY OPENJSON(t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments]) AS alarm
            WHERE t.StartTime BETWEEN @startDate AND @endDate
              AND t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments] <> '[]'
          ),
          AlarmeContagem AS (
            SELECT TOP 10
              JSON_VALUE(alarm.Value, '$.Name') AS AlarmName,
              JSON_VALUE(alarm.Value, '$.Type') AS AlarmType,
              COUNT(*) AS Frequency,
              RANK() OVER (ORDER BY COUNT(*) DESC) AS Ranking
            FROM [TOMEs_DB].[dbo].[TrimaViewData] t
            CROSS APPLY OPENJSON(t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments]) AS alarm
            WHERE t.StartTime BETWEEN @startDate AND @endDate
              AND t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments] <> '[]'
            GROUP BY JSON_VALUE(alarm.Value, '$.Name'), JSON_VALUE(alarm.Value, '$.Type')
          )
          SELECT 
            YEAR(@endDate) AS Ano,
            MONTH(@endDate) AS Mes,
            JSON_QUERY((
              SELECT AlarmName, AlarmType, Frequency,
              ROUND(CAST(Frequency AS FLOAT) * 100 / NULLIF(t.TotalAlarms, 0), 2) AS Percentual,
              Ranking
              FROM AlarmeContagem a
              ORDER BY Ranking
              FOR JSON PATH
            )) AS Valor
          FROM TotalAlarmes t
        `;
        break;

      // Reveos indicators
      case "componentesProcessados":
        query = `
          WITH ComponentData AS (
            SELECT 
              YEAR(r.[StartDate]) AS Ano,
              MONTH(r.[StartDate]) AS Mes,
              COUNT(CASE WHEN p.[PlasmaVolume] > 0 THEN 1 END) AS TotalPlasma,
              COUNT(CASE WHEN p.[PlateletVolume] > 0 THEN 1 END) AS TotalPlatelets
            FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
            INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
            WHERE r.[StartDate] BETWEEN @startDate AND @endDate
              AND r.[StartDate] IS NOT NULL
            GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
          )
          SELECT 
            Ano,
            Mes,
            (TotalPlasma + TotalPlatelets) AS Valor
          FROM ComponentData
          ORDER BY Ano, Mes
        `;
        break;
      case "duracao":
        query = `
          SELECT 
            YEAR(StartDate) AS Ano,
            MONTH(StartDate) AS Mes,
            ROUND(AVG(CAST(RunDuration AS float) / 600000000), 0) AS Valor
          FROM [TOMEsReveosDb].[dbo].[RunData]
          WHERE StartDate BETWEEN @startDate AND @endDate
            AND StartDate IS NOT NULL
            AND RunDuration IS NOT NULL
          GROUP BY YEAR(StartDate), MONTH(StartDate)
          ORDER BY Ano, Mes
        `;
        break;
      case "volumeMedioPlaquetas":
        query = `
          SELECT 
            YEAR(r.[StartDate]) AS Ano,
            MONTH(r.[StartDate]) AS Mes,
            ROUND(AVG(CAST(p.[PlateletVolume] AS float)), 1) AS Valor
          FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
          INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
          WHERE r.[StartDate] BETWEEN @startDate AND @endDate
            AND r.[StartDate] IS NOT NULL
            AND p.[PlateletVolume] > 0
          GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
          ORDER BY Ano, Mes
        `;
        break;
      case "pyiPlaquetas":
        query = `
          SELECT 
            YEAR(r.[StartDate]) AS Ano,
            MONTH(r.[StartDate]) AS Mes,
            ROUND(AVG(CAST(p.[PlateletYieldIndex] AS float)), 1) AS Valor
          FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
          INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
          WHERE r.[StartDate] BETWEEN @startDate AND @endDate
            AND r.[StartDate] IS NOT NULL
            AND p.[PlateletYieldIndex] > 0
          GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
          ORDER BY Ano, Mes
        `;
        break;
      case "volumeMedioPlasma":
        query = `
          SELECT 
            YEAR(r.[StartDate]) AS Ano,
            MONTH(r.[StartDate]) AS Mes,
            ROUND(AVG(CAST(p.[PlasmaVolume] AS float)), 1) AS Valor
          FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
          INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
          WHERE r.[StartDate] BETWEEN @startDate AND @endDate
            AND r.[StartDate] IS NOT NULL
            AND p.[PlasmaVolume] > 0
          GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
          ORDER BY Ano, Mes
        `;
        break;
      case "volumeTotalPlasma":
        query = `
          SELECT 
            YEAR(r.[StartDate]) AS Ano,
            MONTH(r.[StartDate]) AS Mes,
            SUM(CAST(p.[PlasmaVolume] AS float)) AS Valor
          FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
          INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
          WHERE r.[StartDate] BETWEEN @startDate AND @endDate
            AND r.[StartDate] IS NOT NULL
            AND p.[PlasmaVolume] > 0
          GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
          ORDER BY Ano, Mes
        `;
        break;
      case "top10AlarmesReveos":
        query = `
          WITH TotalProcedures AS (
            SELECT COUNT(*) as TotalProc
            FROM [TOMEsReveosDb].[dbo].[RunDataDonations]
            WHERE CreateDate BETWEEN @startDate AND @endDate
              AND DonationStatus <> 'CounterBalance'
          ),
          AlarmeContagem AS (
            SELECT TOP 10
              AlarmId,
              Message,
              COUNT(*) as Frequency,
              RANK() OVER (ORDER BY COUNT(*) DESC) AS Ranking
            FROM [TOMEsReveosDb].[dbo].[RunDataMessageEntries]
            WHERE TimeStamp BETWEEN @startDate AND @endDate
            GROUP BY AlarmId, Message
          )
          SELECT 
            YEAR(@endDate) AS Ano,
            MONTH(@endDate) AS Mes,
            JSON_QUERY((
              SELECT AlarmId, Message, Frequency,
              ROUND(CAST(Frequency AS FLOAT) * 100 / NULLIF(p.TotalProc, 0), 2) as Percentual,
              Ranking
              FROM AlarmeContagem a
              ORDER BY Ranking
              FOR JSON PATH
            )) AS Valor
          FROM TotalProcedures p
        `;
        break;

      default:
        return { indicator, data: null, error: "Indicador não implementado" };
    }

    // Executar a consulta
    const request = pool.request();
    request.input("startDate", sql.DateTime, startDate);
    request.input("endDate", sql.DateTime, endDate);

    const result = await request.query(query);
    return { indicator, data: result.recordset };
  } catch (error) {
    console.error(`Erro ao buscar dados do indicador ${indicator}:`, error);
    return { indicator, data: null, error: error.message };
  } finally {
    if (pool) await pool.close();
  }
}

// Função para carregar template de email
async function getEmailTemplate(templateId = "default") {
  try {
    // Verificar se o arquivo de templates existe
    try {
      await fs.access(EMAIL_TEMPLATES_FILE);
    } catch (error) {
      // Se o arquivo não existir, retornar o template padrão em memória
      console.log("Arquivo de templates não encontrado, usando padrão em memória");
      return {
        name: "Padrão",
        description: "Template padrão do sistema",
        color: "#2c70b8",
        accent: "#5e72e4",
        backgroundColor: "#ffffff",
        textColor: "#333333",
        isDefault: true,
      };
    }

    // Ler o arquivo de templates
    const fileContent = await fs.readFile(EMAIL_TEMPLATES_FILE, "utf8");
    const templates = JSON.parse(fileContent);

    // Se o template solicitado não existir, usar o padrão
    if (!templates[templateId]) {
      console.log(`Template ${templateId} não encontrado, usando padrão`);
      return (
        templates.default || {
          name: "Padrão",
          description: "Template padrão do sistema",
          color: "#2c70b8",
          accent: "#5e72e4",
          backgroundColor: "#ffffff",
          textColor: "#333333",
          isDefault: true,
        }
      );
    }

    return templates[templateId];
  } catch (error) {
    console.error("Erro ao carregar template de email:", error);
    // Retornar template padrão em caso de erro
    return {
      name: "Padrão",
      description: "Template padrão do sistema",
      color: "#2c70b8",
      accent: "#5e72e4",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      isDefault: true,
    };
  }
}

// Função para gerar o HTML para cada indicador (adicionar antes da função generateEmailContent)
function generateIndicatorHTML(indicator, data) {
  if (!data || data.length === 0) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${getIndicatorTitle(indicator)}</h3>
        </div>
        <p style="color: #777;">Dados não disponíveis para este indicador.</p>
      </div>
    `;
  }

  // Obter o dado mais recente
  const latestData = data[data.length - 1];

  // Para indicadores com múltiplos valores (ex: HtHb)
  if (indicator === "htHbPreDoador" && latestData.ValorHt && latestData.ValorHb) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${getIndicatorTitle(indicator)}</h3>
        </div>
        <div class="card-value">
          Ht: ${latestData.ValorHt}% / Hb: ${latestData.ValorHb} g/dL
        </div>
        <p>Período: ${latestData.Mes}/${latestData.Ano}</p>
      </div>
    `;
  }

  // Para indicadores de alarmes (retornam JSON)
  if (indicator === "top10Alarmes" || indicator === "top10AlarmesReveos") {
    try {
      let alarmes = [];
      if (typeof latestData.Valor === "string") {
        alarmes = JSON.parse(latestData.Valor);
      } else {
        alarmes = latestData.Valor || [];
      }

      if (!alarmes || alarmes.length === 0) {
        return `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">${getIndicatorTitle(indicator)}</h3>
            </div>
            <p style="color: #777;">Não foram registrados alarmes no período.</p>
          </div>
        `;
      }

      let alarmesHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${getIndicatorTitle(indicator)}</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Alarme</th>
                <th>Frequência</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
      `;

      alarmes.forEach((alarme) => {
        alarmesHTML += `
          <tr>
            <td>${alarme.Ranking}</td>
            <td>${alarme.AlarmName || alarme.Message || "N/A"}</td>
            <td>${alarme.Frequency}</td>
            <td>${alarme.Percentual}%</td>
          </tr>
        `;
      });

      alarmesHTML += `
            </tbody>
          </table>
          <p>Período: ${latestData.Mes}/${latestData.Ano}</p>
        </div>
      `;

      return alarmesHTML;
    } catch (error) {
      console.error(`Erro ao processar dados de alarmes para ${indicator}:`, error);
      return `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${getIndicatorTitle(indicator)}</h3>
          </div>
          <p style="color: #777;">Erro ao processar dados de alarmes.</p>
        </div>
      `;
    }
  }

  // Para indicadores padrão
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${getIndicatorTitle(indicator)}</h3>
      </div>
      <div class="card-value">
        ${latestData.Valor !== undefined ? latestData.Valor : "N/A"}
      </div>
      <p>Período: ${latestData.Mes}/${latestData.Ano}</p>
    </div>
  `;
}

// Função auxiliar para obter título do indicador
function getIndicatorTitle(indicator) {
  const titles = {
    // Dashboard
    doacoesPorAfereses: "Total de Doações por Aféreses",
    doacoesPorSangueTotal: "Total de Doações por Sangue Total",
    componentesProduzidos: "Total de Componentes Produzidos",
    produtividade: "Produtividade",

    // Trima
    plaquetasOfertadasColetadas: "Total de Plaquetas Oferecidas x Coletadas",
    plaquetasPreDoador: "Plaquetas Pré-Doador",
    htHbPreDoador: "Ht/Hb Pré-Doador",
    duracaoProcedimentos: "Duração dos Procedimentos",
    top10Alarmes: "Top 10 Alarmes - Trima",

    // Reveos
    componentesProcessados: "Componentes Processados",
    duracao: "Duração",
    volumeMedioPlaquetas: "Volume Médio de Plaquetas",
    pyiPlaquetas: "PYI Plaquetas",
    volumeMedioPlasma: "Volume Médio de Plasma",
    volumeTotalPlasma: "Volume Total de Plasma",
    top10AlarmesReveos: "Top 10 Alarmes - Reveos",
  };

  return titles[indicator] || indicator;
}

// Função para gerar o conteúdo completo do email
async function generateEmailContent(userSettings) {
  // Carregar template de email baseado nas preferências do usuário
  const templateId = userSettings.emailTemplate || "default";
  const template = await getEmailTemplate(templateId);

  // Cores a partir do template
  const primaryColor = template.color || "#2c70b8";
  const accentColor = template.accent || "#5e72e4";
  const backgroundColor = template.backgroundColor || "#ffffff";
  const textColor = template.textColor || "#333333";
  const headerBgColor = template.headerBgColor || primaryColor;
  const headerTextColor = template.headerTextColor || "#ffffff";
  const footerBgColor = template.footerBgColor || "#f9f9f9";
  const footerTextColor = template.footerTextColor || "#777777";

  // Determinar o período dos dados com base na frequência
  const today = new Date();
  const endDate = new Date(today);
  let startDate;

  switch (userSettings.frequency) {
    case "daily":
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7); // Últimos 7 dias
      break;
    case "weekly":
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30); // Últimos 30 dias
      break;
    case "monthly":
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 3); // Últimos 3 meses
      break;
  }

  // Mapear os nomes antigos para os novos (para compatibilidade)
  const indicatorMapping = {
    // Dashboard
    totalDonationsAferese: "doacoesPorAfereses",
    totalDoacoesAferese: "doacoesPorAfereses",
    doacoesAferese: "doacoesPorAfereses",
    totalDonationsSangueTotal: "doacoesPorSangueTotal",
    totalDoacoesSangueTotal: "doacoesPorSangueTotal",
    doacoesSangueTotal: "doacoesPorSangueTotal",
    totalComponentesProduzidos: "componentesProduzidos",
    componentesProduzidos: "componentesProduzidos",
    produtividadeGeral: "produtividade",
    produtividadePorUsuario: "produtividade",
    produtividadeUsuario: "produtividade",

    // Trima
    totalDonations: "doacoesPorAfereses",
    totalDoacoes: "doacoesPorAfereses",
    plateletOfferedVsCollected: "plaquetasOfertadasColetadas",
    totalOfertadoXColetado: "plaquetasOfertadasColetadas",
    plaquetasOfertadasXColetadas: "plaquetasOfertadasColetadas",
    plateletCount: "plaquetasPreDoador",
    hemoglobinLevels: "htHbPreDoador",
    procedureDuration: "duracaoProcedimentos",
    alarmFrequency: "top10Alarmes",

    // Reveos
    processedComponents: "componentesProcessados",
    totalComponentesProcessados: "componentesProcessados",
    processingTime: "duracao",
    plateletVolume: "volumeMedioPlaquetas",
    plateletYield: "pyiPlaquetas",
    plateletIndex: "pyiPlaquetas",
    plasmaVolume: "volumeMedioPlasma",
    totalPlasmaVolume: "volumeTotalPlasma",
    equipmentAlarms: "top10AlarmesReveos",
  };

  // Coletar todos os indicadores selecionados e mapeá-los para os novos nomes
  const selectedIndicators = [];

  if (userSettings.dashboardIndicators) {
    Object.entries(userSettings.dashboardIndicators)
      .filter(([_, selected]) => selected)
      .forEach(([indicator]) => {
        const mappedIndicator = indicatorMapping[indicator] || indicator;
        if (!selectedIndicators.includes(mappedIndicator)) {
          selectedIndicators.push(mappedIndicator);
        }
      });
  }

  if (userSettings.trimaIndicators) {
    Object.entries(userSettings.trimaIndicators)
      .filter(([_, selected]) => selected)
      .forEach(([indicator]) => {
        const mappedIndicator = indicatorMapping[indicator] || indicator;
        if (!selectedIndicators.includes(mappedIndicator)) {
          selectedIndicators.push(mappedIndicator);
        }
      });
  }

  if (userSettings.reveosIndicators) {
    Object.entries(userSettings.reveosIndicators)
      .filter(([_, selected]) => selected)
      .forEach(([indicator]) => {
        const mappedIndicator = indicatorMapping[indicator] || indicator;
        if (!selectedIndicators.includes(mappedIndicator)) {
          selectedIndicators.push(mappedIndicator);
        }
      });
  }

  // Buscar dados para cada indicador
  const indicatorsData = await Promise.all(
    selectedIndicators.map((indicator) => getIndicatorData(indicator, startDate, endDate))
  );

  // Gerar o HTML para o email
  let emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Indicadores</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        
        body {
          font-family: 'Roboto', Arial, sans-serif;
          line-height: 1.6;
          color: ${textColor};
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 700px;
          margin: 0 auto;
          background-color: ${backgroundColor};
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border-radius: 8px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(
    primaryColor,
    -30
  )} 100%);
          color: ${headerTextColor};
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-weight: 600;
          font-size: 28px;
        }
        .header p {
          margin: 0;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          color: ${primaryColor};
          border-bottom: 2px solid #eaeaea;
          padding-bottom: 8px;
          margin-top: 30px;
          margin-bottom: 20px;
          font-weight: 500;
          font-size: 22px;
        }
        .card {
          background-color: ${backgroundColor};
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          padding: 20px;
          margin-bottom: 20px;
          border-left: 4px solid ${primaryColor};
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .card-title {
          font-weight: 500;
          color: ${textColor};
          margin: 0;
          font-size: 18px;
        }
        .card-value {
          font-size: 24px;
          font-weight: 600;
          color: ${primaryColor};
          margin: 10px 0;
        }
        .trend {
          display: flex;
          align-items: center;
          font-size: 14px;
        }
        .trend-up {
          color: #4caf50;
        }
        .trend-down {
          color: #f44336;
        }
        .trend-neutral {
          color: #9e9e9e;
        }
        .footer {
          background-color: ${footerBgColor};
          text-align: center;
          font-size: 13px;
          color: ${footerTextColor};
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .footer p {
          margin: 5px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: ${primaryColor};
          color: white;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: 500;
          text-align: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border-radius: 4px;
          overflow: hidden;
        }
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #eaeaea;
        }
        th {
          background-color: #f5f7fa;
          font-weight: 500;
          color: ${primaryColor};
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:hover {
          background-color: #f9fbfd;
        }
        .chart-container {
          background-color: ${backgroundColor};
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          padding: 20px;
          margin: 20px 0;
        }
        .summary {
          background-color: #f5f7fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid ${accentColor};
        }
        .summary-title {
          font-weight: 500;
          color: ${accentColor};
          margin-top: 0;
        }
        
        /* Estilos responsivos */
        @media screen and (max-width: 600px) {
          .header {
            padding: 20px 15px;
          }
          .header h1 {
            font-size: 22px;
          }
          .content {
            padding: 20px 15px;
          }
          .card {
            padding: 15px;
          }
          .card-value {
            font-size: 20px;
          }
          th, td {
            padding: 8px 10px;
            font-size: 14px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Relatório de Indicadores</h1>
          <p>Atualizado em: ${new Date().toLocaleDateString("pt-BR")}</p>
        </div>
        <div class="content">
          <p>Olá,</p>
          <p>Segue abaixo o relatório dos indicadores selecionados com dados atualizados e análises comparativas:</p>
  `;

  // Mapeamento de indicadores para categorias
  const categoryMapping = {
    doacoesPorAfereses: "Dashboard",
    doacoesPorSangueTotal: "Dashboard",
    componentesProduzidos: "Dashboard",
    produtividade: "Dashboard",

    plaquetasOfertadasColetadas: "Trima",
    plaquetasPreDoador: "Trima",
    htHbPreDoador: "Trima",
    duracaoProcedimentos: "Trima",
    top10Alarmes: "Trima",

    componentesProcessados: "Reveos",
    duracao: "Reveos",
    volumeMedioPlaquetas: "Reveos",
    pyiPlaquetas: "Reveos",
    volumeMedioPlasma: "Reveos",
    volumeTotalPlasma: "Reveos",
    top10AlarmesReveos: "Reveos",
  };

  // Agrupar indicadores por categoria
  const categories = {
    Dashboard: [],
    Trima: [],
    Reveos: [],
  };

  // Distribuir os indicadores nas categorias corretas
  indicatorsData.forEach((item) => {
    const category = categoryMapping[item.indicator] || "Outros";
    if (categories[category]) {
      categories[category].push(item);
    } else {
      categories["Outros"] = categories["Outros"] || [];
      categories["Outros"].push(item);
    }
  });

  // Adicionar cada categoria ao conteúdo do email
  for (const [category, indicators] of Object.entries(categories)) {
    if (indicators.length > 0) {
      emailContent += `
        <h2 class="section-title">
          ${category}
        </h2>
        <div class="section">
      `;

      for (const indicator of indicators) {
        emailContent += generateIndicatorHTML(indicator.indicator, indicator.data);
      }

      emailContent += `</div>`;
    }
  }

  // Finalizar o conteúdo do email
  emailContent += `
          <div class="summary">
            <h3 class="summary-title">Resumo Geral</h3>
            <p>Este relatório apresenta uma visão geral dos indicadores selecionados. Para análises mais detalhadas, recomendamos acessar o Dashboard completo.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.REACT_APP_URL || "http://localhost:3000"
            }" class="cta-button">Acessar o Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
          <p>© ${new Date().getFullYear()} Dashboard - Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailContent;
}

// Função principal para enviar emails
async function sendNotificationEmails(options = {}) {
  console.log("Iniciando verificação de notificações para envio...");

  // Opções para controle adicional (testes, depuração)
  const {
    specificUserId, // ID específico de usuário para enviar apenas para ele
    testEmail, // Email de teste (substituir emails dos usuários)
    dryRun = false, // Se true, simula o envio sem realmente enviar emails
  } = options;

  try {
    // Obter data atual
    const today = new Date();
    console.log(`Data atual: ${today.toLocaleString("pt-BR")}`);

    // Verificar se é um horário válido para envio (7h da manhã) - ignorar em caso de teste forçado
    if (!options.hasOwnProperty("specificUserId") && today.getHours() !== 7) {
      console.log("Não é o horário de envio (7h da manhã). Pulando verificação.");
      return { status: "skipped", reason: "not_execution_time" };
    }

    // Buscar todas as configurações de notificações
    const allSettings = await getNotificationSettings();
    if (!allSettings || Object.keys(allSettings).length === 0) {
      console.log("Nenhuma configuração de notificação encontrada.");
      return { status: "skipped", reason: "no_configurations" };
    }

    console.log(`Encontradas ${Object.keys(allSettings).length} configurações de notificação.`);

    // Filtrar usuários que devem receber emails hoje ou o usuário específico se indicado
    let usersToNotify = [];

    if (specificUserId) {
      // Enviar apenas para o usuário específico
      const userSettings = allSettings[specificUserId];
      if (userSettings && userSettings.email) {
        usersToNotify = [userSettings];
        console.log(`Modo de teste: Enviando apenas para usuário ${specificUserId}`);
      } else {
        console.log(`Usuário ${specificUserId} não encontrado ou sem email configurado`);
        return { status: "skipped", reason: "user_not_found" };
      }
    } else {
      // Filtrar usuários que devem receber emails hoje
      usersToNotify = Object.values(allSettings).filter(
        (settings) => settings && settings.email && shouldSendEmail(settings.frequency, today)
      );
    }

    console.log(`${usersToNotify.length} usuários devem receber notificações.`);

    // Resultados para relatório
    const results = {
      status: "completed",
      totalUsers: usersToNotify.length,
      success: 0,
      failed: 0,
      dryRun,
      details: [],
    };

    // Enviar email para cada usuário
    for (const userSettings of usersToNotify) {
      try {
        // Substituir email por email de teste se especificado
        const emailDestination = testEmail || userSettings.email;
        console.log(`Gerando email para: ${emailDestination} ${dryRun ? "(simulação)" : ""}`);

        // Gerar conteúdo do email
        const emailContent = await generateEmailContent(userSettings);

        // Preparar o assunto com base na frequência
        let assunto = "";
        switch (userSettings.frequency) {
          case "daily":
            assunto = `Dashboard - Relatório Diário de Indicadores (${today.toLocaleDateString(
              "pt-BR"
            )})`;
            break;
          case "weekly":
            const weekNumber = Math.ceil((today.getDate() - today.getDay()) / 7);
            assunto = `Dashboard - Relatório Semanal de Indicadores (Semana ${weekNumber} - ${today.toLocaleDateString(
              "pt-BR"
            )})`;
            break;
          case "monthly":
            const month = today.toLocaleString("pt-BR", { month: "long" });
            assunto = `Dashboard - Relatório Mensal de Indicadores (${month}/${today.getFullYear()})`;
            break;
          default:
            assunto = `Dashboard - Relatório de Indicadores - ${today.toLocaleDateString("pt-BR")}`;
        }

        // Se for dry run, apenas simular o envio
        if (dryRun) {
          console.log(`[SIMULAÇÃO] Email seria enviado para ${emailDestination}: ${assunto}`);
          results.success++;
          results.details.push({
            email: emailDestination,
            username: userSettings.username,
            frequency: userSettings.frequency,
            success: true,
            dryRun: true,
          });
          continue;
        }

        // Enviar o email
        const info = await transporter.sendMail({
          from: `"Dashboard de Indicadores" <${emailConfig.auth.user}>`,
          to: emailDestination,
          subject: assunto,
          html: emailContent,
        });

        console.log(`Email enviado com sucesso para ${emailDestination}: ${info.messageId}`);
        results.success++;
        results.details.push({
          email: emailDestination,
          username: userSettings.username,
          frequency: userSettings.frequency,
          success: true,
          messageId: info.messageId,
        });
      } catch (error) {
        console.error(`Erro ao enviar email para ${userSettings.email}:`, error);
        results.failed++;
        results.details.push({
          email: userSettings.email,
          username: userSettings.username,
          frequency: userSettings.frequency,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(
      `Processamento de notificações concluído. Sucesso: ${results.success}, Falhas: ${results.failed}`
    );
    return results;
  } catch (error) {
    console.error("Erro ao processar notificações:", error);
    return {
      status: "error",
      error: error.message,
    };
  }
}

// Configura o agendamento para verificar todos os dias às 7h da manhã
// '0 7 * * *' = Todos os dias às 7h00
const notificationJob = cron.schedule("0 7 * * *", sendNotificationEmails, {
  scheduled: true,
  timezone: "America/Sao_Paulo", // Ajustar para o fuso horário do servidor
});

// Função para iniciar o agendador
function startScheduler() {
  console.log("Iniciando agendador de notificações...");
  notificationJob.start();

  // Verificação imediata para desenvolvimento/teste (descomente se necessário)
  // setTimeout(sendNotificationEmails, 1000);
}

// Exportação das funções principais
module.exports = {
  startScheduler,
  sendNotificationEmails,
  generateEmailContent, // Exportar a função para uso pela rota de teste
};
