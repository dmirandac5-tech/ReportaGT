// Base de datos SQLite: un archivo local, sin servidor que instalar.
const Database = require('better-sqlite3');
const path = require('path');

// DB_FILE solo se usa en las pruebas automáticas (base temporal, para no tocar los datos reales)
const db = new Database(process.env.DB_FILE || path.join(__dirname, '..', 'reportagt.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS reportes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria     TEXT NOT NULL,
    descripcion   TEXT NOT NULL,
    nombre        TEXT NOT NULL,
    email         TEXT NOT NULL,
    direccion     TEXT NOT NULL,
    sector        TEXT NOT NULL,
    lat           REAL NOT NULL,
    lng           REAL NOT NULL,
    foto          TEXT,
    estado        TEXT NOT NULL DEFAULT 'pendiente',
    creado_en     TEXT NOT NULL,
    actualizado_en TEXT NOT NULL
  )
`);

// Si la base ya existía sin la columna del texto de "Otro", se agrega
if (!db.prepare('PRAGMA table_info(reportes)').all().some((c) => c.name === 'categoria_otro')) {
  db.exec('ALTER TABLE reportes ADD COLUMN categoria_otro TEXT');
}

// El número de seguimiento sale del id: 1 -> RGT-0001
const numeroReporte = (id) => 'RGT-' + String(id).padStart(4, '0');

module.exports = { db, numeroReporte };
