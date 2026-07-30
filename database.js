const { Pool } = require("pg");

// Render/Prod: DATABASE_URL aus Environment
// Lokal: DATABASE_URL aus der .env-Datei
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDb() {
  // Bestehende Buchungstabelle
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGSERIAL PRIMARY KEY,
      nachname TEXT NOT NULL,
      appartement TEXT NOT NULL,
      sup TEXT NOT NULL,
      datum DATE NOT NULL,
      von TIME NOT NULL,
      bis TIME NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS bookings_sup_datum_idx
    ON bookings (sup, datum);
  `);

  // Neue Tabelle für gespeicherte Abrechnungs-PDFs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_documents (
      id BIGSERIAL PRIMARY KEY,
      appartement TEXT NOT NULL,
      datum_von DATE NOT NULL,
      datum_bis DATE NOT NULL,
      dateiname TEXT NOT NULL,
      pdf_data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS billing_documents_created_at_idx
    ON billing_documents (created_at DESC);
  `);
}

module.exports = {
  pool,
  initDb,
};