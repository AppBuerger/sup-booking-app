const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function constraintExists(constraintName) {
  const result = await pool.query(
    `SELECT 1
     FROM pg_constraint
     WHERE conname = $1
     LIMIT 1`,
    [constraintName]
  );

  return result.rowCount > 0;
}

async function initDb() {
  await pool.query("BEGIN");

  try {
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
        ('SUP 1', 'SUP', 5.00, 2.50, 'sup1.jpg', 1),
        ('SUP 2', 'SUP', 5.00, 2.50, 'sup2.jpg', 2),
        ('Ruderboot', 'Boot', 15.00, 7.50, 'ruderboot.jpg', 3),
        ('Paddelboot', 'Boot', 10.00, 5.00, 'paddelboot.jpg', 4)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Bestehende Struktur bleibt vollständig erhalten.
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

    // Rückwärtskompatible Erweiterung:
    // sup bleibt vorerst als lesbarer Namens-Snapshot bestehen.
    await pool.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS device_id BIGINT;
    `);

    // Bestehende Buchungen automatisch den Geräten zuordnen.
    await pool.query(`
      UPDATE bookings b
      SET device_id = d.id
      FROM rental_devices d
      WHERE b.device_id IS NULL
        AND b.sup = d.name;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS bookings_device_datum_idx
      ON bookings (device_id, datum);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS bookings_sup_datum_idx
      ON bookings (sup, datum);
    `);

    if (!(await constraintExists("bookings_device_id_fkey"))) {
      await pool.query(`
        ALTER TABLE bookings
        ADD CONSTRAINT bookings_device_id_fkey
        FOREIGN KEY (device_id)
        REFERENCES rental_devices(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
      `);
    }

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

      // Einträge für den digitalen Gästeguide
     await pool.query(`
      CREATE TABLE IF NOT EXISTS guest_places (
        id BIGSERIAL PRIMARY KEY,

        section TEXT NOT NULL,

        name_de TEXT NOT NULL,
        name_en TEXT,

        category_de TEXT,
        category_en TEXT,

        description_de TEXT,
        description_en TEXT,

        website_url TEXT,
        maps_url TEXT,
        phone TEXT,

        is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        display_order INTEGER NOT NULL DEFAULT 0,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS guest_places_section_active_order_idx
      ON guest_places (
        section,
        is_active,
        display_order,
        name_de
        );
    `);

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }


}

module.exports = {
  pool,
  initDb,
};
