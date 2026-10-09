// Base de datos SQLite: un archivo local, sin servidor que instalar.
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'reportagt.db'));

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

// El número de seguimiento sale del id: 1 -> RGT-0001
const numeroReporte = (id) => 'RGT-' + String(id).padStart(4, '0');

module.exports = { db, numeroReporte };
