require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initDb } = require("./database");
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
