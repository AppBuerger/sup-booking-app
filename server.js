require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { pool, initDb } = require("./database");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// --- Konfiguration / Stammdaten ---

const SUPS = [
  { id: 1, name: "SUP 1" },
  { id: 2, name: "SUP 2" },
  { id: 3, name: "Ruderboot" },
  { id: 4, name: "Paddelboot" }
];

// --- Hilfsfunktionen ---

function isHalfHourTime(time) {
  return /^\d{2}:(00|30)(:\d{2})?$/.test(time);
}

function timeToMinutes(time) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = String(time)
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function checkAdmin(req, res, next) {
  const adminKey = req.headers["x-admin-key"];

  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({
      error: "ADMIN_KEY ist am Server nicht gesetzt.",
    });
  }

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      error: "Nicht autorisiert.",
    });
  }

  next();
}

// --- Routes ---

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/sups", (req, res) => {
  res.json(SUPS);
});

app.get(
  "/api/admin/check",
  checkAdmin,
  (req, res) => {
    return res.json({
      ok: true,
    });
  }
);

// Buchungen abrufen
app.get("/api/bookings", async (req, res) => {
  try {
    const result = await pool.query(
  `SELECT
     id,
     nachname,
     appartement,
     sup,
     TO_CHAR(datum, 'YYYY-MM-DD') AS datum,
     TO_CHAR(von, 'HH24:MI') AS von,
     TO_CHAR(bis, 'HH24:MI') AS bis
   FROM bookings
   ORDER BY datum ASC, von ASC`
  );

    return res.json(result.rows);
  } catch (error) {
    console.error("Fehler beim Laden der Buchungen:", error);
    console.error("Einzelfehler:", error.errors);
    console.error("Ursache:", error.cause);

    return res.status(500).json({
      message:
        error?.message ||
        String(error) ||
        "Unbekannter Datenbankfehler",
    });
  }
});

// Buchung anlegen
app.post("/api/book", async (req, res) => {
  const { appartement, sup, datum, von, bis } = req.body;

  if (!appartement || !sup || !datum || !von || !bis) {
    return res.status(400).json({
      message: "Bitte fülle alle Felder aus.",
    });
  }

  const allowedSupNames = SUPS.map((item) => item.name);

  if (!allowedSupNames.includes(sup)) {
    return res.status(400).json({
      message: "Das ausgewählte Gerät ist ungültig.",
    });
  }

  if (!isHalfHourTime(von) || !isHalfHourTime(bis)) {
    return res.status(400).json({
      message: "Buchungen sind nur im Halbstundentakt möglich.",
    });
  }

  const startMinutes = timeToMinutes(von);
const endMinutes = timeToMinutes(bis);
const durationMinutes = endMinutes - startMinutes;

if (durationMinutes <= 0) {
  return res.status(400).json({
    message: "Die Endzeit muss nach der Startzeit liegen.",
  });
}

if (durationMinutes < 60) {
  return res.status(400).json({
    message: "Die Mindestbuchungsdauer beträgt eine Stunde.",
  });
}

if (durationMinutes % 30 !== 0) {
  return res.status(400).json({
    message:
      "Die Buchungsdauer muss in 30-Minuten-Schritten erfolgen.",
  });
}

  try {
    const conflict = await pool.query(
      `SELECT
         id,
         von,
         bis
       FROM bookings
       WHERE sup = $1
         AND datum = $2
         AND von < $4
         AND bis > $3
       LIMIT 1`,
      [sup, datum, von, bis]
    );

    if (conflict.rowCount > 0) {
      const existingBooking = conflict.rows[0];

      return res.status(409).json({
        message:
          `${sup} ist von ` +
          `${String(existingBooking.von).slice(0, 5)} bis ` +
          `${String(existingBooking.bis).slice(0, 5)} Uhr bereits gebucht.`,
      });
    }

    const inserted = await pool.query(
      `INSERT INTO bookings
         (
           nachname,
           appartement,
           sup,
           datum,
           von,
           bis
         )
       VALUES
         ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        "",
        appartement,
        sup,
        datum,
        von,
        bis,
      ]
    );

    return res.status(201).json({
      message: "Buchung erfolgreich gespeichert.",
      id: inserted.rows[0].id,
    });
  } } catch (error) {
  console.error("Fehler beim Speichern der Buchung:", error);
  console.error("Fehlermeldung:", error.message);
  console.error("Fehlercode:", error.code);

  return res.status(500).json({
    message:
      error?.message ||
      "Die Buchung konnte nicht gespeichert werden.",
  });
}
});

// Buchung im Adminbereich löschen
app.delete(
  "/api/admin/delete/:id",
  checkAdmin,
  async (req, res) => {
    const id = req.params.id;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        error: "Ungültige Buchungs-ID.",
      });
    }

    try {
      const result = await pool.query(
        `DELETE FROM bookings
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Buchung wurde nicht gefunden.",
        });
      }

      return res.json({
        ok: true,
        message: "Buchung wurde gelöscht.",
      });
    } catch (error) {
      console.error("Fehler beim Löschen der Buchung:", error);

      return res.status(500).json({
        error: "Die Buchung konnte nicht gelöscht werden.",
      });
    }
  }
);

// --- Server starten ---

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