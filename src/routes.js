// Rutas de la API de ReportaGT.
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { db, numeroReporte } = require('./db');
const mailer = require('./mailer');

const router = express.Router();

// --- Subida de fotos: solo imágenes, máximo 5 MB, nombre aleatorio ---
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(8).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(EXT[file.mimetype] ? null : new Error('La foto debe ser JPG, PNG o WEBP.'), !!EXT[file.mimetype]),
});

// Convierte una fila de la BD en lo que se muestra públicamente (sin correo del vecino)
const publico = (r) => ({
  id: r.id, numero: numeroReporte(r.id), categoria: r.categoria, descripcion: r.descripcion,
  nombre: r.nombre, direccion: r.direccion, sector: r.sector, lat: r.lat, lng: r.lng,
  foto: r.foto ? '/uploads/' + r.foto : null, estado: r.estado, creado_en: r.creado_en,
});

// GET /api/config: categorías y sectores para llenar los selects del formulario
router.get('/config', (req, res) => {
  res.json({ categorias: config.categorias, estados: config.estados, sectores: config.sectores });
});

// GET /api/reportes: todos los reportes (más recientes primero)
router.get('/reportes', (req, res) => {
  res.json(db.prepare('SELECT * FROM reportes ORDER BY id DESC').all().map(publico));
});

// GET /api/resumen: conteos por categoría y por sector para priorizar
router.get('/resumen', (req, res) => {
  // Solo cuentan los que aún no están resueltos: son los que hay que atender
  const porCategoria = db.prepare(
    "SELECT categoria, COUNT(*) AS total FROM reportes WHERE estado != 'resuelto' GROUP BY categoria ORDER BY total DESC").all();
  const porSector = db.prepare(
    "SELECT sector, categoria, COUNT(*) AS total FROM reportes WHERE estado != 'resuelto' GROUP BY sector, categoria").all();
  res.json({ porCategoria, porSector });
});

// POST /api/reportes: crea un reporte y manda los dos correos
router.post('/reportes', (req, res, next) => {
  upload.single('foto')(req, res, (err) => (err ? next(err) : crear(req, res)));
});

async function crear(req, res) {
  const { categoria, descripcion, nombre, email, direccion, sector } = req.body;
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);

  // 1) Validación
  const errores = [];
  if (!config.categorias.includes(categoria)) errores.push('Elige una categoría válida.');
  if (!descripcion || descripcion.trim().length < 5 || descripcion.length > 500) errores.push('La descripción debe tener entre 5 y 500 caracteres.');
  if (!nombre || nombre.trim().length < 2 || nombre.length > 80) errores.push('Escribe tu nombre.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) errores.push('Escribe un correo válido.');
  if (!direccion || direccion.trim().length < 3 || direccion.length > 200) errores.push('Escribe una dirección de referencia.');
  if (!config.sectores.includes(sector)) errores.push('Elige un sector.');
  // El rango es solo un chequeo básico de que el punto esté en Guatemala
  if (!(lat >= 13.5 && lat <= 18 && lng >= -92.5 && lng <= -88)) errores.push('Marca la ubicación en el mapa.');
  if (errores.length) return res.status(400).json({ ok: false, errores });

  // 2) Guardar en SQLite (el reporte queda guardado aunque falle el correo)
  const ahora = new Date().toISOString();
  const info = db.prepare(`INSERT INTO reportes
    (categoria, descripcion, nombre, email, direccion, sector, lat, lng, foto, creado_en, actualizado_en)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    categoria, descripcion.trim(), nombre.trim(), email.trim(), direccion.trim(), sector,
    lat, lng, req.file ? req.file.filename : null, ahora, ahora);
  const reporte = { ...db.prepare('SELECT * FROM reportes WHERE id = ?').get(info.lastInsertRowid) };
  reporte.numero = numeroReporte(reporte.id);

  // 3) Enviar los dos correos; cada uno por separado para saber cuál falló
  const avisos = [];
  try { await mailer.enviarAMunicipalidad(reporte); }
  catch (e) { console.error('[correo muni]', e.message); avisos.push('No se pudo enviar el correo a la municipalidad.'); }
  try { await mailer.enviarConfirmacionVecino(reporte); }
  catch (e) { console.error('[correo vecino]', e.message); avisos.push('No se pudo enviar el correo de confirmación.'); }

  console.log(`Reporte ${reporte.numero} guardado` + (avisos.length ? ` (con avisos: ${avisos.join(' ')})` : ' y correos enviados'));
  res.status(201).json({ ok: true, numero: reporte.numero, avisos });
}

// PATCH /api/reportes/:id/estado: la "municipalidad" cambia el estado (demo, sin login)
router.patch('/reportes/:id/estado', async (req, res) => {
  const { estado } = req.body;
  if (!config.estados.includes(estado)) return res.status(400).json({ ok: false, errores: ['Estado no válido.'] });
  const r = db.prepare('SELECT * FROM reportes WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ ok: false, errores: ['Reporte no encontrado.'] });

  db.prepare('UPDATE reportes SET estado = ?, actualizado_en = ? WHERE id = ?').run(estado, new Date().toISOString(), r.id);
  const actualizado = { ...r, estado, numero: numeroReporte(r.id) };

  const avisos = [];
  try { await mailer.enviarCambioEstado(actualizado); }
  catch (e) { console.error('[correo estado]', e.message); avisos.push('El estado se guardó, pero no se pudo avisar al vecino por correo.'); }
  res.json({ ok: true, numero: actualizado.numero, estado, avisos });
});

module.exports = router;
