const express = require("express");
const { pool } = require("../database");
const { checkAdmin } = require("../middleware/admin");

const router = express.Router();

function normalizeDeviceInput(body) {
  return {
    name: String(body.name || "").trim(),
    category: String(body.category || "SUP").trim() || "SUP",
    firstHourPrice: Number(body.first_hour_price),
    additionalHalfHourPrice: Number(
      body.additional_half_hour_price
    ),
    imageFilename: String(body.image_filename || "").trim() || null,
    displayOrder: Number.parseInt(body.display_order, 10) || 0,
    isActive:
      body.is_active === true ||
      body.is_active === "true" ||
      body.is_active === 1 ||
      body.is_active === "1",
  };
}

function validateDevice(device) {
  if (!device.name) {
    return "Bitte einen Gerätenamen eingeben.";
  }

  if (
    !Number.isFinite(device.firstHourPrice) ||
    device.firstHourPrice < 0
  ) {
    return "Der Preis für die erste Stunde ist ungültig.";
  }

  if (
    !Number.isFinite(device.additionalHalfHourPrice) ||
    device.additionalHalfHourPrice < 0
  ) {
    return "Der Preis für weitere 30 Minuten ist ungültig.";
  }

  return null;
}

// Öffentlich: nur aktive Geräte.
router.get("/api/sups", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        category,
        first_hour_price,
        additional_half_hour_price,
        image_filename,
        display_order
      FROM rental_devices
      WHERE is_active = TRUE
      ORDER BY display_order ASC, name ASC
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("Fehler beim Laden der Geräte:", error);

    return res.status(500).json({
      message: "Die Geräteliste konnte nicht geladen werden.",
    });
  }
});

// Admin: aktive und inaktive Geräte.
router.get("/api/admin/devices", checkAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        category,
        first_hour_price,
        additional_half_hour_price,
        image_filename,
        display_order,
        is_active,
        created_at,
        updated_at
      FROM rental_devices
      ORDER BY display_order ASC, name ASC
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("Fehler beim Laden der Geräteverwaltung:", error);

    return res.status(500).json({
      error: "Die Geräte konnten nicht geladen werden.",
    });
  }
});

router.post("/api/admin/devices", checkAdmin, async (req, res) => {
  const device = normalizeDeviceInput(req.body);
  const validationError = validateDevice(device);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rental_devices (
         name,
         category,
         first_hour_price,
         additional_half_hour_price,
         image_filename,
         display_order,
         is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        device.name,
        device.category,
        device.firstHourPrice,
        device.additionalHalfHourPrice,
        device.imageFilename,
        device.displayOrder,
        device.isActive,
      ]
    );

    return res.status(201).json({
      message: "Das Gerät wurde angelegt.",
      device: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Ein Gerät mit diesem Namen ist bereits vorhanden.",
      });
    }

    console.error("Fehler beim Anlegen des Geräts:", error);

    return res.status(500).json({
      error: "Das Gerät konnte nicht angelegt werden.",
    });
  }
});

router.put("/api/admin/devices/:id", checkAdmin, async (req, res) => {
  const id = req.params.id;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: "Ungültige Geräte-ID." });
  }

  const device = normalizeDeviceInput(req.body);
  const validationError = validateDevice(device);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const oldResult = await client.query(
      `SELECT name
       FROM rental_devices
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (oldResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Das Gerät wurde nicht gefunden.",
      });
    }

    const oldName = oldResult.rows[0].name;

    const result = await client.query(
      `UPDATE rental_devices
       SET
         name = $2,
         category = $3,
         first_hour_price = $4,
         additional_half_hour_price = $5,
         image_filename = $6,
         display_order = $7,
         is_active = $8,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        device.name,
        device.category,
        device.firstHourPrice,
        device.additionalHalfHourPrice,
        device.imageFilename,
        device.displayOrder,
        device.isActive,
      ]
    );

    // Namens-Snapshot bestehender Buchungen aktualisieren.
    // Die stabile Verbindung erfolgt weiterhin über device_id.
    if (oldName !== device.name) {
      await client.query(
        `UPDATE bookings
         SET sup = $2
         WHERE device_id = $1`,
        [id, device.name]
      );
    }

    await client.query("COMMIT");

    return res.json({
      message: "Das Gerät wurde gespeichert.",
      device: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Ein Gerät mit diesem Namen ist bereits vorhanden.",
      });
    }

    console.error("Fehler beim Speichern des Geräts:", error);

    return res.status(500).json({
      error: "Das Gerät konnte nicht gespeichert werden.",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
