// Configuración central: lee el archivo .env y deja todo en un solo objeto.
require('dotenv').config();

// Sectores de Boca del Monte (APROXIMADOS: cuadrícula de 3x2 sobre el área del barrio).
// Formato: [sur, oeste, norte, este]. Para usar límites reales, cambia solo estos números.
const zonas = {
  'Sector 1': [14.5455, -90.5348, 14.5566, -90.5301],
  'Sector 2': [14.5455, -90.5301, 14.5566, -90.5253],
  'Sector 3': [14.5455, -90.5253, 14.5566, -90.5206],
  'Sector 4': [14.5345, -90.5348, 14.5455, -90.5301],
  'Sector 5': [14.5345, -90.5301, 14.5455, -90.5253],
  'Sector 6': [14.5345, -90.5253, 14.5455, -90.5206],
};

// Devuelve el nombre del sector donde cae un punto (o null si está fuera de Boca del Monte)
function sectorDe(lat, lng) {
  return Object.keys(zonas).find((n) => {
    const [sur, oeste, norte, este] = zonas[n];
    return lat >= sur && lat < norte && lng >= oeste && lng < este;
  }) || null;
}

module.exports = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  // Acceso del personal de la muni al panel /admin (definidos en .env)
  adminUser: process.env.ADMIN_USER || '',
  adminPass: process.env.ADMIN_PASS || '',
  // Secreto para firmar la cookie de sesión; si falta, se genera uno al arrancar (las sesiones se cierran al reiniciar)
  sessionSecret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
  muniEmail: process.env.MUNI_EMAIL || 'muni@villacanales.test',
  mailFrom: process.env.MAIL_FROM || 'ReportaGT <reportagt@villacanales.test>',
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  // Catálogo de categorías del prototipo (solo problemas de la calle). "Otro" deja que el vecino escriba cuál es.
  categorias: ['Bache', 'Basura en la calle', 'Alumbrado público dañado', 'Calle sin pavimentar',
    'Vehículo abandonado o dañado', 'Tragante tapado', 'Otro'],
  estados: ['pendiente', 'en proceso', 'resuelto'],
  zonas,
  sectores: Object.keys(zonas),
  sectorDe,
};
