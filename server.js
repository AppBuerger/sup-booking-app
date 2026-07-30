require("dotenv").config();

const express = require("express");
const cors = require("cors");
const PDFDocument = require("pdfkit");
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

function formatDateForFilename(value) {
  const [year, month, day] = String(value)
    .slice(0, 10)
    .split("-");

  return `${day}-${month}-${year}`;
}

function createBillingFilename(
  appartement,
  datumVon,
  datumBis
) {
  const apartmentPart = String(appartement)
    .trim()
    .replace(/\s+/g, "_");

  return (
    `${apartmentPart}_` +
    `${formatDateForFilename(datumVon)}_` +
    `${formatDateForFilename(datumBis)}.pdf`
  );
}

function formatDateGerman(value) {
  const [year, month, day] = String(value)
    .slice(0, 10)
    .split("-");

  return `${day}.${month}.${year}`;
}

function formatEuro(value) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function calculateBookingPrice(booking) {
  const startMinutes = timeToMinutes(booking.von);
  const endMinutes = timeToMinutes(booking.bis);
  const durationMinutes = endMinutes - startMinutes;

  if (durationMinutes < 60) {
    return 0;
  }

  let firstHourPrice;
  let additionalHalfHourPrice;

  switch (booking.sup) {
    case "SUP 1":
    case "SUP 2":
      firstHourPrice = 5;
      additionalHalfHourPrice = 2.5;
      break;

    case "Ruderboot":
      firstHourPrice = 15;
      additionalHalfHourPrice = 7.5;
      break;

    case "Paddelboot":
      firstHourPrice = 10;
      additionalHalfHourPrice = 5;
      break;

    default:
      return 0;
  }

  const additionalMinutes =
    Math.max(0, durationMinutes - 60);

  const additionalHalfHours =
    Math.ceil(additionalMinutes / 30);

  return (
    firstHourPrice +
    additionalHalfHours * additionalHalfHourPrice
  );
}

function createBillingPdf({
  appartement,
  datumVon,
  datumBis,
  bookings,
}) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 45,
    });

    const chunks = [];

    document.on("data", (chunk) => {
      chunks.push(chunk);
    });

    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    document.on("error", reject);

    document
      .fontSize(22)
      .text("Abrechnung Bootsverleih", {
        align: "center",
      });

    document.moveDown();

    document
      .fontSize(12)
      .text(`Appartement: ${appartement}`)
      .text(
        `Aufenthalt: ${formatDateGerman(datumVon)} bis ` +
        `${formatDateGerman(datumBis)}`
      );

    document.moveDown(1.5);

    const columnPositions = {
      datum: 45,
      zeit: 130,
      geraet: 230,
      dauer: 350,
      betrag: 455,
    };

    function drawHeader() {
      document.font("Helvetica-Bold").fontSize(10);

      document.text("Datum", columnPositions.datum);
      document.text("Zeit", columnPositions.zeit);
      document.text("Gerät", columnPositions.geraet);
      document.text("Dauer", columnPositions.dauer);
      document.text("Betrag", columnPositions.betrag);

      document.moveDown(0.6);

      document
        .moveTo(45, document.y)
        .lineTo(550, document.y)
        .stroke();

      document.moveDown(0.7);
      document.font("Helvetica");
    }

    drawHeader();

    let total = 0;

    bookings.forEach((booking) => {
      if (document.y > 745) {
        document.addPage();
        drawHeader();
      }

      const startMinutes = timeToMinutes(booking.von);
      const endMinutes = timeToMinutes(booking.bis);
      const durationMinutes = endMinutes - startMinutes;

      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;

      const durationText =
        minutes === 0
          ? `${hours} Std.`
          : `${hours} Std. ${minutes} Min.`;

      const price = calculateBookingPrice(booking);

      total += price;

      const rowY = document.y;

      document.fontSize(9);

      document.text(
        formatDateGerman(booking.datum),
        columnPositions.datum,
        rowY
      );

      document.text(
        `${String(booking.von).slice(0, 5)}–` +
        `${String(booking.bis).slice(0, 5)}`,
        columnPositions.zeit,
        rowY
      );

      document.text(
        booking.sup,
        columnPositions.geraet,
        rowY
      );

      document.text(
        durationText,
        columnPositions.dauer,
        rowY
      );

      document.text(
        formatEuro(price),
        columnPositions.betrag,
        rowY,
        {
          width: 90,
          align: "right",
        }
      );

      document.y = rowY + 22;
    });

    document.moveDown();

    document
      .moveTo(350, document.y)
      .lineTo(550, document.y)
      .stroke();

    document.moveDown(0.7);

    document
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(
        `Gesamt: ${formatEuro(total)}`,
        350,
        document.y,
        {
          width: 200,
          align: "right",
        }
      );

    document
      .font("Helvetica")
      .fontSize(9)
      .text("Appartements Bürger", 45, 790, {
        align: "center",
        width: 505,
      });

    document.end();
  });
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

// Öffentliche Buchungsübersicht:
// nur heutige und zukünftige Buchungen
app.get("/api/bookings/upcoming", async (req, res) => {
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
       WHERE datum >= CURRENT_DATE
       ORDER BY datum ASC, von ASC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(
      "Fehler beim Laden der zukünftigen Buchungen:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Die Buchungen konnten nicht geladen werden.",
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
  } catch (error) {
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

function getDateValue(value) {
  return String(value || "").slice(0, 10);
}

function formatDateGerman(value) {
  const [year, month, day] = getDateValue(value).split("-");
  return `${day}.${month}.${year}`;
}

function formatDateForFilename(value) {
  const [year, month, day] = getDateValue(value).split("-");
  return `${day}-${month}-${year}`;
}

function createBillingFilename(
  appartement,
  datumVon,
  datumBis
) {
  const apartmentPart = String(appartement)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    `${apartmentPart}_` +
    `${formatDateForFilename(datumVon)}_` +
    `${formatDateForFilename(datumBis)}.pdf`
  );
}

function formatEuro(value) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} Std.`;
  }

  return `${hours} Std. ${remainingMinutes} Min.`;
}

function calculateBookingPrice(booking) {
  const startMinutes = timeToMinutes(booking.von);
  const endMinutes = timeToMinutes(booking.bis);
  const durationMinutes = endMinutes - startMinutes;

  if (durationMinutes < 60) {
    return 0;
  }

  let firstHourPrice = 0;
  let additionalHalfHourPrice = 0;

  switch (booking.sup) {
    case "SUP 1":
    case "SUP 2":
      firstHourPrice = 5;
      additionalHalfHourPrice = 2.5;
      break;

    case "Ruderboot":
      firstHourPrice = 15;
      additionalHalfHourPrice = 7.5;
      break;

    case "Paddelboot":
      firstHourPrice = 10;
      additionalHalfHourPrice = 5;
      break;

    default:
      return 0;
  }

  const additionalMinutes =
    Math.max(0, durationMinutes - 60);

  const additionalHalfHours =
    Math.ceil(additionalMinutes / 30);

  return (
    firstHourPrice +
    additionalHalfHours * additionalHalfHourPrice
  );
}

function createBillingPdf({
  appartement,
  datumVon,
  datumBis,
  bookings,
}) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 45,
    });

    const chunks = [];

    document.on("data", (chunk) => {
      chunks.push(chunk);
    });

    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    document.on("error", reject);

    const columns = {
      datum: 45,
      zeit: 125,
      geraet: 220,
      dauer: 340,
      betrag: 455,
    };

    function drawTableHeader() {
      const rowY = document.y;

      document
        .font("Helvetica-Bold")
        .fontSize(10);

      document.text("Datum", columns.datum, rowY);
      document.text("Zeit", columns.zeit, rowY);
      document.text("Gerät", columns.geraet, rowY);
      document.text("Dauer", columns.dauer, rowY);
      document.text(
        "Betrag",
        columns.betrag,
        rowY,
        {
          width: 90,
          align: "right",
        }
      );

      document.y = rowY + 18;

      document
        .moveTo(45, document.y)
        .lineTo(550, document.y)
        .stroke();

      document.y += 9;
      document.font("Helvetica");
    }

    document
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("Abrechnung Bootsverleih", {
        align: "center",
      });

    document.moveDown();

    document
      .font("Helvetica")
      .fontSize(12)
      .text(`Appartement: ${appartement}`)
      .text(
        `Aufenthalt: ${formatDateGerman(datumVon)} bis ` +
        `${formatDateGerman(datumBis)}`
      );

    document.moveDown(1.5);

    drawTableHeader();

    let total = 0;

    bookings.forEach((booking) => {
      if (document.y > 730) {
        document.addPage();
        drawTableHeader();
      }

      const startMinutes =
        timeToMinutes(booking.von);

      const endMinutes =
        timeToMinutes(booking.bis);

      const durationMinutes =
        endMinutes - startMinutes;

      const price =
        calculateBookingPrice(booking);

      total += price;

      const rowY = document.y;

      document
        .font("Helvetica")
        .fontSize(9);

      document.text(
        formatDateGerman(booking.datum),
        columns.datum,
        rowY
      );

      document.text(
        `${String(booking.von).slice(0, 5)}–` +
        `${String(booking.bis).slice(0, 5)}`,
        columns.zeit,
        rowY
      );

      document.text(
        booking.sup,
        columns.geraet,
        rowY
      );

      document.text(
        formatDuration(durationMinutes),
        columns.dauer,
        rowY
      );

      document.text(
        formatEuro(price),
        columns.betrag,
        rowY,
        {
          width: 90,
          align: "right",
        }
      );

      document.y = rowY + 22;
    });

    document.y += 6;

    document
      .moveTo(350, document.y)
      .lineTo(550, document.y)
      .stroke();

    document.y += 10;

    document
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(
        `Gesamt: ${formatEuro(total)}`,
        350,
        document.y,
        {
          width: 200,
          align: "right",
        }
      );

    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64777d")
      .text(
        "Appartements Bürger",
        45,
        790,
        {
          width: 505,
          align: "center",
        }
      );

    document.end();
  });
}

// PDF erstellen und speichern
app.post(
  "/api/admin/billing-documents",
  checkAdmin,
  async (req, res) => {
    const {
      appartement,
      datumVon,
      datumBis,
    } = req.body;

    if (
      !appartement ||
      !datumVon ||
      !datumBis
    ) {
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
      const bookingsResult =
        await pool.query(
          `SELECT
             id,
             appartement,
             sup,
             TO_CHAR(datum, 'YYYY-MM-DD') AS datum,
             TO_CHAR(von, 'HH24:MI') AS von,
             TO_CHAR(bis, 'HH24:MI') AS bis
           FROM bookings
           WHERE appartement = $1
             AND datum BETWEEN $2 AND $3
           ORDER BY datum ASC, von ASC`,
          [
            appartement,
            datumVon,
            datumBis,
          ]
        );

      if (bookingsResult.rowCount === 0) {
        return res.status(404).json({
          error:
            "Für diesen Aufenthalt wurden keine Buchungen gefunden.",
        });
      }

      const dateiname =
        createBillingFilename(
          appartement,
          datumVon,
          datumBis
        );

      const pdfBuffer =
        await createBillingPdf({
          appartement,
          datumVon,
          datumBis,
          bookings: bookingsResult.rows,
        });

      const result =
        await pool.query(
          `INSERT INTO billing_documents
             (
               appartement,
               datum_von,
               datum_bis,
               dateiname,
               pdf_data
             )
           VALUES
             ($1, $2, $3, $4, $5)
           RETURNING
             id,
             appartement,
             TO_CHAR(
               datum_von,
               'YYYY-MM-DD'
             ) AS datum_von,
             TO_CHAR(
               datum_bis,
               'YYYY-MM-DD'
             ) AS datum_bis,
             dateiname,
             created_at`,
          [
            appartement,
            datumVon,
            datumBis,
            dateiname,
            pdfBuffer,
          ]
        );

      return res.status(201).json({
        message:
          "PDF wurde erstellt und gespeichert.",
        document: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Fehler beim Erstellen der PDF:",
        error
      );

      return res.status(500).json({
        error:
          error?.message ||
          "Die PDF konnte nicht erstellt werden.",
      });
    }
  }
);

// Liste gespeicherter PDFs
app.get(
  "/api/admin/billing-documents",
  checkAdmin,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `SELECT
             id,
             appartement,
             TO_CHAR(
               datum_von,
               'YYYY-MM-DD'
             ) AS datum_von,
             TO_CHAR(
               datum_bis,
               'YYYY-MM-DD'
             ) AS datum_bis,
             dateiname,
             created_at
           FROM billing_documents
           ORDER BY created_at DESC, id DESC`
        );

      return res.json(result.rows);
    } catch (error) {
      console.error(
        "Fehler beim Laden der PDFs:",
        error
      );

      return res.status(500).json({
        error:
          "Die gespeicherten PDFs konnten nicht geladen werden.",
      });
    }
  }
);

// PDF öffnen oder herunterladen
app.get(
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
      const result =
        await pool.query(
          `SELECT
             dateiname,
             pdf_data
           FROM billing_documents
           WHERE id = $1`,
          [id]
        );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error:
            "Die PDF wurde nicht gefunden.",
        });
      }

      const billingDocument =
        result.rows[0];

      const disposition =
        req.query.download === "1"
          ? "attachment"
          : "inline";

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${billingDocument.dateiname}"`
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store"
      );

      return res.send(
        billingDocument.pdf_data
      );
    } catch (error) {
      console.error(
        "Fehler beim Abrufen der PDF:",
        error
      );

      return res.status(500).json({
        error:
          "Die PDF konnte nicht geladen werden.",
      });
    }
  }
);

// PDF löschen
app.delete(
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
      const result =
        await pool.query(
          `DELETE FROM billing_documents
           WHERE id = $1
           RETURNING id`,
          [id]
        );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error:
            "Die PDF wurde nicht gefunden.",
        });
      }

      return res.json({
        ok: true,
        message:
          "Die PDF wurde gelöscht.",
      });
    } catch (error) {
      console.error(
        "Fehler beim Löschen der PDF:",
        error
      );

      return res.status(500).json({
        error:
          "Die PDF konnte nicht gelöscht werden.",
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