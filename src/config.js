// Configuración central: lee el archivo .env y deja todo en un solo objeto.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  muniEmail: process.env.MUNI_EMAIL || 'muni@villacanales.test',
  mailFrom: process.env.MAIL_FROM || 'ReportaGT <reportagt@villacanales.test>',
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  // Catálogo de categorías del prototipo (solo problemas de la calle)
  categorias: ['Bache', 'Basura en la calle', 'Alumbrado público dañado', 'Calle sin pavimentar'],
  estados: ['pendiente', 'en proceso', 'resuelto'],
  sectores: ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5', 'Sector 6'],
};
