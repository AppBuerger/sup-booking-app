const express = require("express");
const { pool } = require("../database");
const { checkAdmin } = require("../middleware/admin");
const {
  createBillingFilename,
} = require("../utils/format");
const { createBillingPdf } = require("../utils/pdf");

const router = express.Router();

router.post(
  "/api/admin/billing-documents",
  checkAdmin,
  async (req, res) => {
    const { appartement, datumVon, datumBis } = req.body;

    if (!appartement || !datumVon || !datumBis) {
      return res.status(400).json({
        error:
          "Appartement, Von-Datum und Bis-Datum sind erforderlich.",
      });
    }

    if (datumVon > datumBis) {
      return res.status(400).json({
        error:
          "Das Von-Datum darf nicht nach dem Bis-Datum liegen.",
      });
    }

    try {
      const bookingsResult = await pool.query(
        `SELECT
           b.id,
           b.appartement,
           b.device_id,
           COALESCE(d.name, b.sup) AS sup,
           COALESCE(d.name, b.sup) AS device_name,
           TO_CHAR(b.datum, 'YYYY-MM-DD') AS datum,
           TO_CHAR(b.von, 'HH24:MI') AS von,
           TO_CHAR(b.bis, 'HH24:MI') AS bis,
           d.first_hour_price,
           d.additional_half_hour_price
         FROM bookings b
         LEFT JOIN rental_devices d
           ON d.id = b.device_id
         WHERE b.appartement = $1
           AND b.datum BETWEEN $2 AND $3
         ORDER BY b.datum ASC, b.von ASC`,
        [appartement, datumVon, datumBis]
      );

      if (bookingsResult.rowCount === 0) {
        return res.status(404).json({
          error:
            "Für diesen Aufenthalt wurden keine Buchungen gefunden.",
        });
      }

      const dateiname = createBillingFilename(
        appartement,
        datumVon,
        datumBis
      );

      const pdfBuffer = await createBillingPdf({
        appartement,
        datumVon,
        datumBis,
        bookings: bookingsResult.rows,
      });

      const result = await pool.query(
        `INSERT INTO billing_documents (
           appartement,
           datum_von,
           datum_bis,
           dateiname,
           pdf_data
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING
           id,
           appartement,
           TO_CHAR(datum_von, 'YYYY-MM-DD') AS datum_von,
           TO_CHAR(datum_bis, 'YYYY-MM-DD') AS datum_bis,
           dateiname,
           created_at`,
        [appartement, datumVon, datumBis, dateiname, pdfBuffer]
      );

      return res.status(201).json({
        message: "PDF wurde erstellt und gespeichert.",
        document: result.rows[0],
      });
    } catch (error) {
      console.error("Fehler beim Erstellen der PDF:", error);

      return res.status(500).json({
        error:
          error?.message ||
          "Die PDF konnte nicht erstellt werden.",
      });
    }
  }
);

router.get(
  "/api/admin/billing-documents",
  checkAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          appartement,
          TO_CHAR(datum_von, 'YYYY-MM-DD') AS datum_von,
          TO_CHAR(datum_bis, 'YYYY-MM-DD') AS datum_bis,
          dateiname,
          created_at
        FROM billing_documents
        ORDER BY created_at DESC, id DESC
      `);

      return res.json(result.rows);
    } catch (error) {
      console.error("Fehler beim Laden der PDFs:", error);

      return res.status(500).json({
        error:
          "Die gespeicherten PDFs konnten nicht geladen werden.",
      });
    }
  }
);

router.get(
  "/api/admin/billing-documents/:id/pdf",
  checkAdmin,
  async (req, res) => {
    const id = req.params.id;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        error: "Ungültige PDF-ID.",
      });
    }

    try {
      const result = await pool.query(
        `SELECT dateiname, pdf_data
         FROM billing_documents
         WHERE id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Die PDF wurde nicht gefunden.",
        });
      }

      const billingDocument = result.rows[0];
      const disposition =
        req.query.download === "1" ? "attachment" : "inline";

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${billingDocument.dateiname}"`
      );
      res.setHeader("Cache-Control", "private, no-store");

      return res.send(billingDocument.pdf_data);
    } catch (error) {
      console.error("Fehler beim Abrufen der PDF:", error);

      return res.status(500).json({
        error: "Die PDF konnte nicht geladen werden.",
      });
    }
  }
);

router.delete(
  "/api/admin/billing-documents/:id",
  checkAdmin,
  async (req, res) => {
    const id = req.params.id;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        error: "Ungültige PDF-ID.",
      });
    }

    try {
      const result = await pool.query(
        `DELETE FROM billing_documents
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Die PDF wurde nicht gefunden.",
        });
      }

      return res.json({
        ok: true,
        message: "Die PDF wurde gelöscht.",
      });
    } catch (error) {
      console.error("Fehler beim Löschen der PDF:", error);

      return res.status(500).json({
        error: "Die PDF konnte nicht gelöscht werden.",
      });
    }
  }
);

module.exports = router;
