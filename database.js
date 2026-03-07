const { Pool } = require("pg");

// Render/Prod: DATABASE_URL aus Environment
// Lokal: kannst du auch eine .env nutzen (optional), oder direkt setzen
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGSERIAL PRIMARY KEY,
      nachname TEXT NOT NULL,
      appartement TEXT NOT NULL,
      sup TEXT NOT NULL,
      datum DATE NOT NULL,
      von TIME NOT NULL,
      bis TIME NOT NULL,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create index if not exists bookings_sup_datum_idx
    on bookings (sup, datum);
  `);
}

module.exports = { pool, initDb };