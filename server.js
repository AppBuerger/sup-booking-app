const express = require("express");
const cors = require("cors");
const { pool, initDb } = require("./database");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

initDb().catch((e) => console.error("DB init failed:", e));

// --- Konfiguration / Stammdaten ---
const SUPS = [
  { id: 1, name: "SUP 1" },
  { id: 2, name: "SUP 2" },
  { id: 3, name: "SUP 3" },
];

// --- Routes ---

// Healthcheck (optional, hilft beim Debuggen)
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// SUPs abrufen
app.get("/api/sups", (req, res) => {
  res.json(SUPS);
});

// Buchungen abrufen (aus SQLite)
app.get("/api/bookings", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nachname, appartement, sup, datum, von, bis
       FROM bookings
       ORDER BY datum DESC, von ASC`
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Buchung anlegen (SQLite + Überschneidung)
app.post("/api/book", async (req, res) => {
  const { nachname, appartement, sup, datum, von, bis } = req.body;

  if (!nachname || !appartement || !sup || !datum || !von || !bis) {
    return res.status(400).json({ message: "Alle Felder sind Pflichtfelder!" });
  }
  if (von >= bis) {
    return res.status(400).json({ message: "Die 'Bis'-Zeit muss nach der 'Von'-Zeit liegen." });
  }

  try {
    // Überschneidung: NOT (bestehende.bis <= von OR bestehende.von >= bis)
    const conflict = await pool.query(
      `SELECT 1 FROM bookings
       WHERE sup = $1 AND datum = $2
         AND NOT (bis <= $3 OR von >= $4)
       LIMIT 1`,
      [sup, datum, von, bis]
    );

    if (conflict.rowCount > 0) {
      return res.status(400).json({ message: "SUP ist in diesem Zeitraum bereits gebucht!" });
    }

    const inserted = await pool.query(
      `INSERT INTO bookings (nachname, appartement, sup, datum, von, bis)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [nachname.trim(), appartement, sup, datum, von, bis]
    );

    res.json({ message: "Buchung erfolgreich!", id: inserted.rows[0].id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

//Check auf Admin_Key
function checkAdmin(req, res, next) {
  const adminKey = req.headers["x-admin-key"];

  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ error: "ADMIN_KEY ist am Server nicht gesetzt." });
  }

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Nicht autorisiert." });
  }

  next();
}

//Admin Bereich, Buchungen sehen und löschen
app.delete("/api/admin/delete/:id", checkAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query(
      "DELETE FROM bookings WHERE id = $1",
      [id]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Server starten ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});