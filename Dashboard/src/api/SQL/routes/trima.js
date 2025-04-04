const express = require("express");
const sql = require("mssql");
const router = express.Router();
const config = require("../config/database");

// Rota para informações do doador (hematócrito, hemoglobina, plaquetas)
router.get("/donorInfo", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar informações do doador:", error);
    res.status(500).json({ error: "Erro ao buscar informações do doador" });
  }
});

// Rota para procedimentos de aférese
router.get("/apheresisProcedures", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        [VALUE] as CodigoDoacao,
        [TIME] as DataProcedimento,
        SESSION_DATA_ID as SessinID
      FROM [TOMEs_DB].[dbo].[TrimaSessionEventResults]
      WHERE [CATEGORY] = 'Donation ID'
      AND [TIME] >= DATEADD(YEAR, -2, GETDATE())
      ORDER BY [TIME] DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar procedimentos de aférese:", error);
    res.status(500).json({ error: "Erro ao buscar procedimentos" });
  }
});

// Rota para relatório do Trima
router.get("/trimaReport/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    await sql.connect(config);

    const request = new sql.Request();
    request.input("sessionId", sql.Int, sessionId);

    const result = await request.query(`
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
        t.[ExtendedInfoProcedureSelections],
        t.[ExtendedInfoVerificationMessages],
        (
            SELECT 
                [NAME] AS [name],
                [CATEGORY] AS [category],
                [TIME] AS [time],
                [VALUE] AS [value],
                [PREFIX_LENGTH] AS [prefix],
                [SUFFIX_LENGTH] AS [sufix]
            FROM [TOMEs_DB].[dbo].[TrimaSessionEventResults] r2
            WHERE r2.[SESSION_DATA_ID] = t.SessionDataId
            AND r2.[CATEGORY] IS NOT NULL
            AND r2.[VALUE] IS NOT NULL
            FOR JSON PATH
        ) AS Barcodes
      FROM [TOMEs_DB].[dbo].[TrimaViewData] t
      WHERE t.SessionDataId = @sessionId
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Relatório não encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Erro ao buscar relatório:", error);
    res.status(500).json({ error: "Erro ao buscar dados do relatório" });
  }
});

// Rota para componentes de aférese
router.get("/apheresisComponents", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar componentes de aférese:", error);
    res.status(500).json({ error: "Erro ao buscar componentes" });
  }
});

// Rota para duração das aféreses
router.get("/apheresisDuration", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar duração das aféreses:", error);
    res.status(500).json({ error: "Erro ao buscar duração" });
  }
});

// Rota para frequência de alarmes
router.get("/alarmsFrequency", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 60; // Default para 60 dias se não for especificado

    await sql.connect(config);
    const result = await sql.query(`
      WITH TotalAlarmes AS (
          SELECT COUNT(*) AS TotalAlarms
          FROM [TOMEs_DB].[dbo].[TrimaViewData] t
          CROSS APPLY OPENJSON(t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments]) AS alarm
          WHERE t.StartTime >= DATEADD(DAY, -${days}, CAST(GETDATE() AS DATE))
            AND t.StartTime <= CAST(GETDATE() AS DATE)
            AND t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments] <> '[]'
      ),
      AlarmeContagem AS (
          SELECT TOP 10
              JSON_VALUE(alarm.Value, '$.Name') AS AlarmName,
              JSON_VALUE(alarm.Value, '$.Type') AS AlarmType,
              COUNT(*) AS Frequency
          FROM [TOMEs_DB].[dbo].[TrimaViewData] t
          CROSS APPLY OPENJSON(t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments]) AS alarm
          WHERE t.StartTime >= DATEADD(DAY, -${days}, CAST(GETDATE() AS DATE))
            AND t.StartTime <= CAST(GETDATE() AS DATE)
            AND t.[ExtendedInfoAlarmsAlertsAdvisoriesAdjustments] <> '[]'
          GROUP BY JSON_VALUE(alarm.Value, '$.Name'), JSON_VALUE(alarm.Value, '$.Type')
          ORDER BY COUNT(*) DESC
      )
      SELECT 
          a.AlarmName,
          a.AlarmType,
          a.Frequency,
          ROUND(CAST(a.Frequency AS FLOAT) * 100 / NULLIF(t.TotalAlarms, 0), 2) AS Percentual
      FROM AlarmeContagem a
      CROSS JOIN TotalAlarmes t
      ORDER BY a.Frequency DESC;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar frequência de alarmes:", error);
    res.status(500).json({ error: "Erro ao buscar frequência de alarmes" });
  }
});

module.exports = router;
