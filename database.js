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
  // Geräte für den Verleih
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rental_devices (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'SUP',
      first_hour_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      additional_half_hour_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      image_filename TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS rental_devices_active_order_idx
    ON rental_devices (is_active, display_order, name);
  `);

  // Bestehende Geräte einmalig eintragen.
  // Bereits vorhandene Geräte werden nicht überschrieben.
  await pool.query(`
    INSERT INTO rental_devices (
      name,
      category,
      first_hour_price,
      additional_half_hour_price,
      image_filename,
      display_order
    )
    VALUES
      (
        'SUP 1',
        'SUP',
        5.00,
        2.50,
        'sup1.jpg',
        1
      ),
      (
        'SUP 2',
        'SUP',
        5.00,
        2.50,
        'sup2.jpg',
        2
      ),
      (
        'Ruderboot',
        'Boot',
        15.00,
        7.50,
        'ruderboot.jpg',
        3
      ),
      (
        'Paddelboot',
        'Boot',
        10.00,
        5.00,
        'paddelboot.jpg',
        4
      )
    ON CONFLICT (name) DO NOTHING;
  `);

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

  // Gespeicherte Abrechnungs-PDFs
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