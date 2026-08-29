require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { pool, initDb } = require("./database");
const { checkAdmin } = require("./middleware/admin");

const devicesRouter = require("./routes/devices");
const bookingsRouter = require("./routes/bookings");
const billingRouter = require("./routes/billing");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/admin/check", checkAdmin, (req, res) => {
  res.json({ ok: true });
});

app.use(devicesRouter);
app.use(bookingsRouter);
app.use(billingRouter);

// Aktive Gästeguide-Einträge laden
app.get("/api/places", async (req, res) => {
  try {
    const section =
      typeof req.query.section === "string"
        ? req.query.section.trim()
        : "";

    const language =
      req.query.lang === "en"
        ? "en"
        : "de";

    const values = [];
    const conditions = [
      "is_active = TRUE",
    ];

    if (section) {
      values.push(section);

      conditions.push(
        `section = $${values.length}`
      );
    }

    const result = await pool.query(
      `
        SELECT
          id,
          section,

          CASE
            WHEN $${values.length + 1} = 'en'
              THEN COALESCE(
                NULLIF(name_en, ''),
                name_de
              )
            ELSE name_de
          END AS name,

          CASE
            WHEN $${values.length + 1} = 'en'
              THEN COALESCE(
                NULLIF(category_en, ''),
                category_de
              )
            ELSE category_de
          END AS category,

          CASE
            WHEN $${values.length + 1} = 'en'
              THEN COALESCE(
                NULLIF(description_en, ''),
                description_de
              )
            ELSE description_de
          END AS description,

          website_url,
          maps_url,
          phone,
          is_recommended,
          display_order

        FROM guest_places

        WHERE ${conditions.join(" AND ")}

        ORDER BY
          section ASC,
          display_order ASC,
          name_de ASC;
      `,
      [
        ...values,
        language,
      ]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(
      "Fehler beim Laden der Gästeguide-Einträge:",
      error
    );

    res.status(500).json({
      error:
        "Die Gästeguide-Einträge konnten nicht geladen werden.",
    });
  }
});

// Alle Gästeguide-Einträge für den Admin laden
app.get(
  "/api/admin/places",
  checkAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          section,
          name_de,
          name_en,
          category_de,
          category_en,
          description_de,
          description_en,
          website_url,
          maps_url,
          phone,
          is_recommended,
          is_active,
          display_order,
          created_at,
          updated_at
        FROM guest_places
        ORDER BY
          section ASC,
          display_order ASC,
          name_de ASC;
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "Fehler beim Laden der Admin-Gästeguide-Einträge:",
        error
      );

      res.status(500).json({
        error:
          "Die Gästeguide-Einträge konnten nicht geladen werden.",
      });
    }
  }
);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDb();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server läuft auf http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("DB init failed:", error);
    process.exit(1);
  }
}

startServer();
