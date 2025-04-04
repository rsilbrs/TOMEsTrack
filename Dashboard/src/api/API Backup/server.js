const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();
const corsOptions = {
  origin: ["http://localhost:3000", `http://${process.env.REACT_APP_URL}:3000`],
  credentials: true,
  methods: ["GET"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: true,
  },
};

const queries = {
  aferese: `
    SELECT
      YEAR(StartTime) AS Ano,
      MONTH(StartTime) AS Mes,
      COUNT(*) AS TotalProcedimentos
    FROM TrimaViewData
    WHERE StartTime >= DATEADD(MONTH, -6, GETDATE())
    GROUP BY YEAR(StartTime), MONTH(StartTime)
    ORDER BY Ano ASC, Mes ASC
  `,
  sangueTotal: `
    SELECT 
        YEAR(RunDateTime) AS Ano,
        MONTH(RunDateTime) AS Mes,
        COUNT(DonationId) AS TotalDoacoes
      FROM [TOMEsReveosDimDb].[dbo].[DimDonations]
      WHERE 
        DonationId IS NOT NULL
        AND RunDateTime >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY YEAR(RunDateTime), MONTH(RunDateTime)
      ORDER BY Ano ASC, Mes ASC
  `,
  componentesTipo: `
    SELECT 
      Ano,
      Mes,
      SUM(PlaquetasAferese) as TotalPlaquetasAferese,
      SUM(PlaquetasST) as TotalPlaquetasST,
      SUM(HemaciasAferese) as TotalHemaciasAferese,
      SUM(HemaciasST) as TotalHemaciasST,
      SUM(PlasmaAferese) as TotalPlasmaAferese,
      SUM(PlasmaST) as TotalPlasmaST
    FROM (
      -- Dados do Trima
      SELECT 
        YEAR(StartTime) AS Ano,
        MONTH(StartTime) AS Mes,
        SUM(
          CASE 
            WHEN [Yield] >= 3 AND [Yield] < 6 THEN 1
            WHEN [Yield] >= 6 AND [Yield] < 9 THEN 2
            WHEN [Yield] >= 9 AND [Yield] <= 12 THEN 3
            ELSE 0
          END
        ) AS PlaquetasAferese,
        0 AS PlaquetasST,
        SUM(
          CASE 
            WHEN [BagVolumeRBC1] > 200 AND [BagVolumeRBC2] > 200 THEN 2
            WHEN [BagVolumeRBC1] > 200 THEN 1
            ELSE 0
          END
        ) AS HemaciasAferese,
        0 AS HemaciasST,
        SUM(
          CASE 
            WHEN [BagVolumePlasma] >= 200 AND [BagVolumePlasma] < 400 THEN 1
            WHEN [BagVolumePlasma] >= 400 AND [BagVolumePlasma] < 600 THEN 2
            WHEN [BagVolumePlasma] >= 600 AND [BagVolumePlasma] <= 900 THEN 3
            ELSE 0
          END
        ) AS PlasmaAferese,
        0 AS PlasmaST
      FROM [TOMEs_DB].[dbo].[TrimaViewData]
      WHERE StartTime >= DATEADD(MONTH, -6, GETDATE())
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
      WHERE rd.StartDate >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY YEAR(rd.StartDate), MONTH(rd.StartDate)
    ) AS CombinedData
    GROUP BY Ano, Mes
    ORDER BY Ano ASC, Mes ASC
  `,
  ultimasDoacoes: `
    SELECT TOP 10 *
    FROM (
      -- Dados do Trima (Aférese)
      SELECT 
        [VALUE] as DonationId,
        [TIME] as DataDoacao,
        'Aférese' as TipoDoacao
      FROM [TOMEs_DB].[dbo].[TrimaSessionEventResults]
      WHERE [CATEGORY] = 'Donation ID'
      AND [VALUE] IN (
        SELECT MAX([VALUE])
        FROM [TOMEs_DB].[dbo].[TrimaSessionEventResults]
        WHERE [CATEGORY] = 'Donation ID'
        GROUP BY [VALUE]
      )

      UNION ALL

      -- Dados do Reveos (Sangue Total)
      SELECT 
        DonationId,
        RunDateTime as DataDoacao,
        'Sangue total' as TipoDoacao
      FROM [TOMEsReveosDimDb].[dbo].[DimDonations]
      WHERE DonationId IS NOT NULL
    ) AS CombinedData
    ORDER BY DataDoacao DESC
  `,
  produtividadeUsuarios: `
    WITH ProdutividadeAferese AS (
      SELECT 
        u.ID,
        COUNT(DISTINCT t.TIME) as TotalAferese
      FROM [TOMEs_DB].[dbo].[Users] u
      LEFT JOIN [TOMEs_DB].[dbo].[TrimaSessionEventResults] t 
      ON u.BARCODE = t.VALUE 
      AND t.CATEGORY = 'Operator ID'
      GROUP BY u.ID
    ),
    ProdutividadeReveos AS (
      SELECT 
        u.ID,
        COUNT(*) as TotalReveos
      FROM [TOMEs_DB].[dbo].[Users] u
      LEFT JOIN [TOMEsReveosDb].[dbo].[RunDataDonations] r 
      ON u.USER_NAME = r.OperatorId
      WHERE r.DonationStatus != 'CounterBalance'
      OR r.DonationStatus IS NULL
      GROUP BY u.ID
    )
    SELECT 
      u.FIRST_NAME,
      u.LAST_NAME,
      ISNULL(pa.TotalAferese, 0) as TotalAferese,
      ISNULL(pr.TotalReveos, 0) as TotalReveos
    FROM [TOMEs_DB].[dbo].[Users] u
    LEFT JOIN ProdutividadeAferese pa ON u.ID = pa.ID
    LEFT JOIN ProdutividadeReveos pr ON u.ID = pr.ID
    WHERE ISNULL(pa.TotalAferese, 0) + ISNULL(pr.TotalReveos, 0) > 1
  `,
  apheresisProcedures: `
    SELECT 
      [VALUE] as CodigoDoacao,
      [TIME] as DataProcedimento,
      SESSION_DATA_ID as SessinID
    FROM [TOMEs_DB].[dbo].[TrimaSessionEventResults]
    WHERE [CATEGORY] = 'Donation ID'
    AND [TIME] >= DATEADD(YEAR, -2, GETDATE())
    ORDER BY [TIME] DESC
  `,
  apheresisComponents: `
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
      WHERE [StartTime] >= DATEADD(MONTH, -6, CAST(GETDATE() AS DATE))
          AND [StartTime] <= CAST(GETDATE() AS DATE)
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
          AND t.[StartTime] >= DATEADD(MONTH, -6, CAST(GETDATE() AS DATE))
          AND t.[StartTime] <= CAST(GETDATE() AS DATE)
      GROUP BY YEAR(t.[StartTime]), MONTH(t.[StartTime])
  )
  SELECT 
      COALESCE(c.Ano, o.Ano) AS Ano,
      COALESCE(c.Mes, o.Mes) AS Mes,
      ISNULL(c.TotalComponentesColetados, 0) AS TotalCollected,
      ISNULL(o.TotalComponentesOferecidos, 0) AS TotalOffered
  FROM CollectedData c
  FULL OUTER JOIN OfferedData o
      ON c.Ano = o.Ano AND c.Mes = o.Mes
  ORDER BY Ano, Mes
  `,
  donorInfo: `
  SELECT 
      YEAR([StartTime]) AS Ano,
      MONTH([StartTime]) AS Mes,
      ROUND(AVG([DonorHematocrit]), 1) AS MediaHematocrit,
      ROUND(AVG([DonorHemoglobin]), 1) AS MediaHemoglobin,
      ROUND(AVG([DonorPreCount]), 0) AS MediaPreCount
  FROM [TOMEs_DB].[dbo].[TrimaViewData]
  WHERE [StartTime] >= DATEADD(MONTH, -6, CAST(GETDATE() AS DATE))
      AND [StartTime] <= CAST(GETDATE() AS DATE)
  GROUP BY YEAR([StartTime]), MONTH([StartTime])
  ORDER BY Ano, Mes
  `,
  trimaReport: `
      SELECT 
        t.[SessionDataId],
        t.[TrimaInputDonorID] as DonorId,
        t.[TrimaInputDonorName] as DonorName,
        t.[TrimaInputDonorDOB] as DOB,
        t.[StartTime] as ProcedureDate,
        t.[GroupName],
        t.[Location],
        t.[Department],
        t.[Date],
        t.[SerialNumber],
        t.[DeviceShortName],
        t.[CassetteTypeRefId],
        t.[DonorBloodType],
        t.[VbpTotal],
        t.[TotalRBCLoss],
        t.[TotalPlasmaLoss],
        t.[DLOGName],
        t.[DonorHeight],
        t.[DonorHeightUnit],
        t.[DonorWeight],
        t.[DonorWeightUnit],
        t.[DurationOfRun],
        t.[EndOfRunDateTime],
        t.[DonorGender],
        t.[DonorHematocrit],
        t.[DonorHemoglobin],
        t.[DonorPreCount],
        t.[DonorPostCount],
        t.[DonorPostHematocrit],
        t.[DonorPostHemoglobin],
        t.[Yield],
        t.[BagVolume],
        t.[BagVolumePlasma],
        t.[BagVolumeRBC1],
        t.[BagVolumeRBC2],
        t.[DrawFlowRate],
        t.[RinsebackComplete],
        t.[ACToDonor],
        t.[TotalACUsedAmount],
        t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments],
        t.[ExtendedInfoProcedureSelections]
      FROM [TOMEs_DB].[dbo].[TrimaViewData] t
      WHERE t.SessionDataId =  @codigo
  `,
  apheresisDuration: `
    SELECT 
      YEAR(StartTime) AS Ano,
      MONTH(StartTime) AS Mes,
      ROUND(AVG(CAST(DurationOfRun AS float) / 600000000), 0) AS AverageDuration
    FROM [TOMEs_DB].[dbo].[TrimaViewData]
    WHERE StartTime >= DATEADD(MONTH, -6, CAST(GETDATE() AS DATE))
      AND StartTime <= CAST(GETDATE() AS DATE)
      AND DurationOfRun IS NOT NULL
    GROUP BY YEAR(StartTime), MONTH(StartTime)
    ORDER BY Ano, Mes
  `,
  reveosProcedures: `
    SELECT [Id]
          ,[CreateDate]
          ,[UnitNumber]
    FROM [TOMEsReveosDb].[dbo].[RunDataDonations]
    WHERE [DonationStatusText] <> 'Counterbalance bag' AND [CreateDate] >= DATEADD(YEAR, -2, GETDATE())
    ORDER BY [Id] DESC
    `,
  reveosComponents: `
    WITH ComponentData AS (
      SELECT 
        YEAR(r.[StartDate]) AS Ano,
        MONTH(r.[StartDate]) AS Mes,
        COUNT(CASE WHEN p.[LeukocyteVolume] > 0 THEN 1 END) AS TotalLeucocytes,
        COUNT(CASE WHEN p.[PlasmaVolume] > 0 THEN 1 END) AS TotalPlasma,
        COUNT(CASE WHEN p.[PlateletVolume] > 0 THEN 1 END) AS TotalPlatelets
      FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
      INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
      WHERE r.[StartDate] IS NOT NULL
        AND r.[StartDate] >= DATEADD(MONTH, -6, GETDATE())
        AND r.[StartDate] <= GETDATE()
      GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
    )
    SELECT 
      Ano,
      Mes,
      TotalLeucocytes,
      TotalPlasma,
      TotalPlatelets,
      (TotalLeucocytes + TotalPlasma + TotalPlatelets) AS TotalComponents
    FROM ComponentData
    ORDER BY Ano, Mes
  `,
  reveosDuration: `
    SELECT 
      YEAR(StartDate) AS Ano,
      MONTH(StartDate) AS Mes,
      ROUND(AVG(CAST(RunDuration AS float) / 600000000), 0) AS AverageDuration
    FROM [TOMEsReveosDb].[dbo].[RunData]
    WHERE StartDate >= DATEADD(MONTH, -6, GETDATE())
      AND StartDate <= GETDATE()
      AND RunDuration IS NOT NULL
    GROUP BY YEAR(StartDate), MONTH(StartDate)
    ORDER BY Ano DESC, Mes DESC
  `,
  reveosComponentsVolume: `
    SELECT 
      YEAR(r.[StartDate]) AS Ano,
      MONTH(r.[StartDate]) AS Mes,
      ROUND(AVG(CAST(p.[PlateletVolume] AS float)), 1) AS PlateletVolume,
      ROUND(AVG(CAST(p.[PlasmaVolume] AS float)), 1) AS PlasmaVolume,
      ROUND(AVG(CAST(p.[LeukocyteVolume] AS float)), 1) AS LeucocyteVolume,
      ROUND(AVG(CAST(p.[PlateletYieldIndex] AS float)), 1) AS PlateletIndex
    FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
    INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
    WHERE r.[StartDate] >= DATEADD(MONTH, -6, GETDATE())
      AND r.[StartDate] <= GETDATE()
      AND r.[StartDate] IS NOT NULL
    GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
    ORDER BY Ano, Mes
    `,
  reveosAlarms: `
    WITH TotalProcedures AS (
      SELECT COUNT(*) as TotalProc
      FROM [TOMEsReveosDb].[dbo].[RunDataDonations]
      WHERE CreateDate >= DATEADD(DAY, -30, GETDATE())
        AND CreateDate <= GETDATE()
        AND DonationStatus <> 'CounterBalance'
    ),
    AlarmeContagem AS (
      SELECT TOP 10
        AlarmId,
        Message,
        COUNT(*) as Frequency
      FROM [TOMEsReveosDb].[dbo].[RunDataMessageEntries]
      WHERE TimeStamp >= DATEADD(DAY, -30, GETDATE())
        AND TimeStamp <= GETDATE()
      GROUP BY AlarmId, Message
      ORDER BY COUNT(*) DESC
    )
    SELECT 
      a.AlarmId,
      a.Message,
      a.Frequency,
      ROUND(CAST(a.Frequency AS FLOAT) * 100 / NULLIF(p.TotalProc, 0), 2) as Percentual
    FROM AlarmeContagem a
    CROSS JOIN TotalProcedures p
    ORDER BY a.Frequency DESC
  `,
  reveosReport: `
  SELECT
       r.[Id]
      ,[BucketNumber]
      ,[UnitNumber]
      ,[DonationStatusText]
      ,[Sealing]
      ,(SELECT [FIRST_NAME] + ' ' + [LAST_NAME] FROM [TOMEs_DB].[dbo].[Users] WHERE [BARCODE] = [OperatorId]) AS OperatorId
      ,[NumAlerts]
      ,[NumAlarms]
      ,[DonationStatus]
      ,[RunDataId]
      ,CAST([BuffyCoatVolume] AS INT) AS BuffyCoatVolume
      ,CAST([LeukocyteVolume] AS INT) AS LeukocyteVolume
      ,CAST([PlasmaVolume] AS INT) AS PlasmaVolume
      ,CAST([PlateletVolume] AS INT) AS PlateletVolume
      ,CAST([PlateletYieldIndex] AS INT) AS PlateletYieldIndex
      ,[StartDate]
      ,[EndDate]
      ,[FirstBarcodeScanTime]
      ,[LastBarcodeScanTime]
      ,[FirstBucketOpenTime]
      ,[LastBucketOpenTime]
      ,[StartBasinTemperature]
      ,[EndBasinTemperature]
      ,([LoadIdleTime] / 600000000) AS LoadIdleTime
      ,([LoadDuration] / 600000000) AS LoadDuration
      ,([ProcedureDuration] / 600000000) AS ProcedureDuration
      ,([RunDuration] / 600000000) AS RunDuration
      ,([IdleTimeDuration] / 600000000) AS IdleTimeDuration
      ,([UnloadDuration] / 600000000) AS UnloadDuration
      ,([FirstLastBucketOpenTimeDiff] / 600000000) AS FirstLastBucketOpenTimeDiff
      ,ISNULL(
        (
            SELECT 
                m.[Message],
                m.[RunLogType],
                m.[AlarmState],
                m.[TimeStamp]
            FROM [TOMEsReveosDb].[dbo].[RunDataMessageEntries] m
            WHERE 
                m.[RunDataId] = r.[RunDataId]  -- Corrigido para usar RunDataId da doação
                AND m.[BucketNumber] = r.[BucketNumber]
            ORDER BY m.[Id] DESC
            FOR JSON PATH
        ), 
        '[]'  -- Retorna um array vazio se não houver alarmes
      ) AS Alarms
      ,ISNULL(
        JSON_QUERY((
            SELECT 
                [ScanTime],
                [BarcodeSystemType],
                [RawScan],
                [BarcodeName]
            FROM [TOMEsReveosDb].[dbo].[RunDataBarcodeScans] b
            WHERE 
                b.[RunDataDonationId] = r.[Id]  -- Vincula pelo Id da doação
            ORDER BY b.[ScanTime] DESC  -- Ordena do mais recente para o mais antigo
            FOR JSON PATH
        )), 
        '[]'
    ) AS BarcodeScans
  FROM [TOMEsReveosDb].[dbo].[RunDataDonations] r
  LEFT JOIN [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p ON r.[Id] = p.[Id]
  LEFT JOIN [TOMEsReveosDb].[dbo].[RunData] d ON r.[RunDataId] = d.[Id]
  WHERE DonationStatus <> 'CounterBalance' AND r.[Id] = @codigo
  `,
};

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acesso negado. Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido ou expirado." });
  }
};

// Função para verificar a senha
function verifyPassword(storedHash, storedSalt, providedPassword) {
  const hash = crypto
    .createHash("sha256")
    .update(providedPassword + storedSalt)
    .digest("hex");
  return hash === storedHash;
}

// Endpoint de autenticação
app.post("/api/auth/signin", async (req, res) => {
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

// Endpoint protegido
app.get("/api/:queryType", authenticateToken, async (req, res) => {
  try {
    const { queryType } = req.params;

    if (!queries[queryType]) {
      return res.status(400).json({ error: "Tipo de consulta não encontrado" });
    }

    await sql.connect(config);
    const result = await sql.query(queries[queryType]);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Novo endpoint para relatório Trima
app.get("/api/trimaReport/:codigo", authenticateToken, async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return res.status(400).json({ error: "Código do procedimento não fornecido" });
    }

    await sql.connect(config);
    const request = new sql.Request();
    request.input("codigo", sql.VarChar, codigo);

    const result = await request.query(queries.trimaReport);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Procedimento não encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Erro ao buscar relatório:", error);
    res.status(500).json({ error: "Erro ao buscar dados do relatório" });
  }
});

// Endpoint para relatório Reveos
app.get("/api/reveosReport/:codigo", authenticateToken, async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return res.status(400).json({ error: "Código do procedimento não fornecido" });
    }

    await sql.connect(config);
    const request = new sql.Request();
    request.input("codigo", sql.VarChar, codigo);

    const result = await request.query(queries.reveosReport);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Procedimento não encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Erro ao buscar relatório:", error);
    res.status(500).json({ error: "Erro ao buscar dados do relatório" });
  }
});

// Verificação de variáveis de ambiente
const requiredEnvVars = ["DB_USER", "DB_PASSWORD", "DB_SERVER", "DB_NAME", "JWT_SECRET"];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Variável de ambiente ${varName} não encontrada!`);
  }
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
