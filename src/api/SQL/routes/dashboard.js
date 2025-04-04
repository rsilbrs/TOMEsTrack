const express = require("express");
const sql = require("mssql");
const router = express.Router();
const config = require("../config/database");

// Rota para total de procedimentos de aférese por mês
router.get("/aferese", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT
        YEAR(StartTime) AS Ano,
        MONTH(StartTime) AS Mes,
        COUNT(*) AS TotalProcedimentos
      FROM [TOMEs_DB].[dbo].[TrimaViewData]
      WHERE StartTime >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY YEAR(StartTime), MONTH(StartTime)
      ORDER BY Ano ASC, Mes ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar dados de aférese:", error);
    res.status(500).json({ error: "Erro ao buscar dados de aférese" });
  }
});

// Rota para produtividade dos usuários
router.get("/produtividadeUsuarios", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar produtividade:", error);
    res.status(500).json({ error: "Erro ao buscar dados de produtividade" });
  }
});

// Rota para sangue total
router.get("/sangueTotal", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar sangue total:", error);
    res.status(500).json({ error: "Erro ao buscar dados de sangue total" });
  }
});

// Rota para componentes por tipo
router.get("/componentesTipo", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar componentes:", error);
    res.status(500).json({ error: "Erro ao buscar componentes por tipo" });
  }
});

// Rota para últimas doações
router.get("/ultimasDoacoes", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
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
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar últimas doações:", error);
    res.status(500).json({ error: "Erro ao buscar últimas doações" });
  }
});

module.exports = router;
