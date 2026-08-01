const express = require("express");
const { pool } = require("../database");
const { checkAdmin } = require("../middleware/admin");
const { validateBookingTimes } = require("../utils/time");

const router = express.Router();

const bookingSelect = `
  SELECT
    b.id,
    b.nachname,
    b.appartement,
    b.device_id,
    COALESCE(d.name, b.sup) AS sup,
    COALESCE(d.name, b.sup) AS device_name,
    TO_CHAR(b.datum, 'YYYY-MM-DD') AS datum,
    TO_CHAR(b.von, 'HH24:MI') AS von,
    TO_CHAR(b.bis, 'HH24:MI') AS bis,
    d.category,
    d.image_filename,
    d.first_hour_price,
    d.additional_half_hour_price
  FROM bookings b
  LEFT JOIN rental_devices d
    ON d.id = b.device_id
`;

router.get("/api/bookings", async (req, res) => {
  try {
    const result = await pool.query(
      `${bookingSelect}
       ORDER BY b.datum ASC, b.von ASC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Fehler beim Laden der Buchungen:", error);

    return res.status(500).json({
      message:
        error?.message ||
        "Die Buchungen konnten nicht geladen werden.",
    });
  }
});

router.get("/api/bookings/upcoming", async (req, res) => {
  try {
    const result = await pool.query(
      `${bookingSelect}
       WHERE b.datum >= CURRENT_DATE
       ORDER BY b.datum ASC, b.von ASC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(
      "Fehler beim Laden der zukünftigen Buchungen:",
      error
    );

    return res.status(500).json({
      message: "Die Buchungen konnten nicht geladen werden.",
    });
  }
});

router.post("/api/book", async (req, res) => {
  const {
    appartement,
    device_id: deviceId,
    sup,
    datum,
    von,
    bis,
  } = req.body;

  if (!appartement || (!deviceId && !sup) || !datum || !von || !bis) {
    return res.status(400).json({
      message: "Bitte fülle alle Felder aus.",
    });
  }

  const timeError = validateBookingTimes(von, bis);

  if (timeError) {
    return res.status(400).json({ message: timeError });
  }

  try {
    const deviceResult = deviceId
      ? await pool.query(
          `SELECT id, name
           FROM rental_devices
           WHERE id = $1
             AND is_active = TRUE
           LIMIT 1`,
          [deviceId]
        )
      : await pool.query(
          `SELECT id, name
           FROM rental_devices
           WHERE name = $1
             AND is_active = TRUE
           LIMIT 1`,
          [sup]
        );

    if (deviceResult.rowCount === 0) {
      return res.status(400).json({
        message:
          "Das ausgewählte Gerät ist ungültig oder derzeit nicht verfügbar.",
      });
    }

    const device = deviceResult.rows[0];

    const conflict = await pool.query(
      `SELECT id, von, bis
       FROM bookings
       WHERE device_id = $1
         AND datum = $2
         AND von < $4
         AND bis > $3
       LIMIT 1`,
      [device.id, datum, von, bis]
    );

    if (conflict.rowCount > 0) {
      const existingBooking = conflict.rows[0];

      return res.status(409).json({
        message:
          `${device.name} ist von ` +
          `${String(existingBooking.von).slice(0, 5)} bis ` +
          `${String(existingBooking.bis).slice(0, 5)} Uhr bereits gebucht.`,
      });
    }

    const inserted = await pool.query(
      `INSERT INTO bookings (
         nachname,
         appartement,
         device_id,
         sup,
         datum,
         von,
         bis
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      ["", appartement, device.id, device.name, datum, von, bis]
    );

    return res.status(201).json({
      message: "Buchung erfolgreich gespeichert.",
      id: inserted.rows[0].id,
    });
  } catch (error) {
    console.error("Fehler beim Speichern der Buchung:", error);

    return res.status(500).json({
      message:
        error?.message ||
        "Die Buchung konnte nicht gespeichert werden.",
    });
  }
});

router.delete(
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

module.exports = router;
