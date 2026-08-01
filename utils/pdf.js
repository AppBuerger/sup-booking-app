const PDFDocument = require("pdfkit");
const { timeToMinutes } = require("./time");
const { calculateBookingPrice } = require("./pricing");
const {
  formatDateGerman,
  formatEuro,
  formatDuration,
} = require("./format");

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

    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
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

      document.font("Helvetica-Bold").fontSize(10);
      document.text("Datum", columns.datum, rowY);
      document.text("Zeit", columns.zeit, rowY);
      document.text("Gerät", columns.geraet, rowY);
      document.text("Dauer", columns.dauer, rowY);
      document.text("Betrag", columns.betrag, rowY, {
        width: 90,
        align: "right",
      });

      document.y = rowY + 18;
      document.moveTo(45, document.y).lineTo(550, document.y).stroke();
      document.y += 9;
      document.font("Helvetica");
    }

    document
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("Abrechnung Bootsverleih", { align: "center" });

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

      const durationMinutes =
        timeToMinutes(booking.bis) - timeToMinutes(booking.von);

      const price = calculateBookingPrice(booking);
      total += price;

      const rowY = document.y;
      document.font("Helvetica").fontSize(9);

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
        booking.device_name || booking.sup,
        columns.geraet,
        rowY
      );

      document.text(
        formatDuration(durationMinutes),
        columns.dauer,
        rowY
      );

      document.text(formatEuro(price), columns.betrag, rowY, {
        width: 90,
        align: "right",
      });

      document.y = rowY + 22;
    });

    document.y += 6;
    document.moveTo(350, document.y).lineTo(550, document.y).stroke();
    document.y += 10;

    document
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`Gesamt: ${formatEuro(total)}`, 350, document.y, {
        width: 200,
        align: "right",
      });

    document
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64777d")
      .text("Appartements Bürger", 45, 790, {
        width: 505,
        align: "center",
      });

    document.end();
  });
}

module.exports = {
  createBillingPdf,
};
