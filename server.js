// Punto de entrada: arranca Express, sirve la web (/public), las fotos (/uploads) y la API.
const express = require('express');
const path = require('path');
const config = require('./src/config');
const routes = require('./src/routes');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Leaflet se sirve desde node_modules (así el mapa no depende de un CDN)
app.use('/vendor/leaflet', express.static(path.join(__dirname, 'node_modules', 'leaflet', 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', routes);

// Manejo de errores: respuestas claras en JSON (foto muy grande, tipo inválido, etc.)
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'La foto pesa más de 5 MB.' : err.message;
  res.status(400).json({ ok: false, errores: [msg] });
});

app.listen(config.port, () => {
  console.log(`ReportaGT corriendo en http://localhost:${config.port}`);
  console.log(`Correo: SMTP ${config.smtp.host}:${config.smtp.port}  ->  muni: ${config.muniEmail}`);
});
