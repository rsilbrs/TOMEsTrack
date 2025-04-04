const express = require("express");
const sql = require("mssql");
const router = express.Router();
const config = require("../config/database");

// Rota para procedimentos do Reveos
router.get("/reveosProcedures", async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT [Id]
            ,[CreateDate]
            ,[UnitNumber]
      FROM [TOMEsReveosDb].[dbo].[RunDataDonations]
      ORDER BY CreateDate DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar procedimentos Reveos:", error);
    res.status(500).json({ error: "Erro ao buscar procedimentos" });
  } finally {
    if (pool) await pool.close();
  }
});

// Rota para duração média dos procedimentos
router.get("/reveosDuration", async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request().query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar duração Reveos:", error);
    res.status(500).json({ error: "Erro ao buscar duração" });
  } finally {
    if (pool) await pool.close();
  }
});

// Rota para volume dos componentes
router.get("/reveosComponentsVolume", async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        YEAR(r.[StartDate]) AS Ano,
        MONTH(r.[StartDate]) AS Mes,
        ROUND(AVG(CAST(p.[PlateletVolume] AS float)), 1) AS PlateletVolume,
        ROUND(AVG(CAST(p.[PlasmaVolume] AS float)), 1) AS PlasmaVolume,
        ROUND(AVG(CAST(p.[PlateletYieldIndex] AS float)), 1) AS PlateletIndex
      FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
      INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
      WHERE r.[StartDate] >= DATEADD(MONTH, -6, GETDATE())
        AND r.[StartDate] <= GETDATE()
        AND r.[StartDate] IS NOT NULL
      GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
      ORDER BY Ano, Mes
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar volumes Reveos:", error);
    res.status(500).json({ error: "Erro ao buscar volumes" });
  } finally {
    if (pool) await pool.close();
  }
});

// Rota para volume total de plasma
router.get("/reveosTotalPlasmaVolume", async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        YEAR(r.[StartDate]) AS Ano,
        MONTH(r.[StartDate]) AS Mes,
        SUM(CAST(p.[PlasmaVolume] AS float)) AS TotalPlasmaVolume
      FROM [TOMEsReveosDb].[dbo].[RunDataBloodProducts] p
      INNER JOIN [TOMEsReveosDb].[dbo].[RunData] r ON p.[Id] = r.[Id]
      WHERE r.[StartDate] >= DATEADD(MONTH, -6, GETDATE())
        AND r.[StartDate] <= GETDATE()
        AND r.[StartDate] IS NOT NULL
        AND p.[PlasmaVolume] > 0
      GROUP BY YEAR(r.[StartDate]), MONTH(r.[StartDate])
      ORDER BY Ano, Mes
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar volume total de plasma:", error);
    res.status(500).json({ error: "Erro ao buscar volume total de plasma" });
  } finally {
    if (pool) await pool.close();
  }
});

// Rota para frequência de alarmes
router.get("/reveosAlarms", async (req, res) => {
  let pool;
  try {
    const days = parseInt(req.query.days) || 60; // Default para 60 dias se não for especificado

    pool = await sql.connect(config);
    const result = await pool.request().query(`
      WITH TotalProcedures AS (
        SELECT COUNT(*) as TotalProc
        FROM [TOMEsReveosDb].[dbo].[RunDataDonations]
        WHERE CreateDate >= DATEADD(DAY, -${days}, GETDATE())
          AND CreateDate <= GETDATE()
          AND DonationStatus <> 'CounterBalance'
      ),
      AlarmeContagem AS (
        SELECT TOP 10
          AlarmId,
          Message,
          COUNT(*) as Frequency
        FROM [TOMEsReveosDb].[dbo].[RunDataMessageEntries]
        WHERE TimeStamp >= DATEADD(DAY, -${days}, GETDATE())
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar alarmes Reveos:", error);
    res.status(500).json({ error: "Erro ao buscar alarmes" });
  } finally {
    if (pool) await pool.close();
  }
});

// Rota para componentes do Reveos
router.get("/reveosComponents", async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request().query(`
    WITH ComponentData AS (
      SELECT 
        YEAR(r.[StartDate]) AS Ano,
        MONTH(r.[StartDate]) AS Mes,
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
      TotalPlasma,
      TotalPlatelets,
      (TotalPlasma + TotalPlatelets) AS TotalComponents
    FROM ComponentData
    ORDER BY Ano, Mes

    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar componentes Reveos:", error);
    res.status(500).json({ error: "Erro ao buscar componentes" });
  } finally {
    if (pool) await pool.close();
  }
});

// Rota para buscar relatório do Reveos
router.get("/reveosReport/:codigo", async (req, res) => {
  let pool;
  try {
    const { codigo } = req.params;
    pool = await sql.connect(config);

    const result = await pool.request().input("codigo", sql.VarChar, codigo).query(`
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
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Relatório não encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Erro ao buscar relatório Reveos:", error);
    res.status(500).json({ error: "Erro ao buscar dados do relatório" });
  } finally {
    if (pool) await pool.close();
  }
});

module.exports = router;
