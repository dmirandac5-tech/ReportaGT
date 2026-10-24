// Envío de correos con nodemailer. El SMTP viene del .env (Mailpit en local, Gmail después).
const nodemailer = require('nodemailer');
const path = require('path');
const config = require('./config');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  // Solo se manda usuario/clave si están definidos (Mailpit no los necesita)
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

// Evita que texto del vecino rompa el HTML del correo
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Marco HTML común para todos los correos
function plantilla(titulo, contenido) {
  return `<!DOCTYPE html><html lang="es"><body style="margin:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#334155">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px">
      <tr><td style="background:#ffffff;border-bottom:4px solid #051B3F;padding:18px 24px"><span style="font-size:26px;font-weight:bold;color:#051B3F">Reporta<span style="color:#1F9D3A">GT</span></span>
        <span style="font-size:13px;display:block;color:#334155">Boca del Monte, Villa Canales</span></td></tr>
      <tr><td style="padding:24px"><h2 style="margin:0 0 16px;font-size:18px;color:#051B3F">${titulo}</h2>${contenido}</td></tr>
      <tr><td style="background:#f3f5f7;padding:12px 24px;font-size:12px;color:#777">Mensaje automático de ReportaGT (prototipo).</td></tr>
    </table></td></tr></table></body></html>`;
}

// Nombre de la categoría; si es "Otro", incluye lo que escribió el vecino
const etiqueta = (r) => (r.categoria === 'Otro' && r.categoria_otro ? `Otro: ${r.categoria_otro}` : r.categoria);

const fila = (k, v) =>
  `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0"><b>${v}</b></td></tr>`;

const fechaLegible = (iso) =>
  new Date(iso).toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Guatemala' });

// Correo 1: a la municipalidad con todos los datos y la foto incrustada
async function enviarAMunicipalidad(r) {
  const mapa = `https://www.google.com/maps?q=${r.lat},${r.lng}`;
  const adjuntos = [];
  let htmlFoto = '';
  if (r.foto) {
    // La foto va incrustada (cid) y además queda como adjunto descargable
    adjuntos.push({ filename: r.foto, path: path.join(__dirname, '..', 'uploads', r.foto), cid: 'foto-reporte' });
    htmlFoto = `<p style="margin:16px 0 4px;color:#666">Foto del vecino:</p>
      <img src="cid:foto-reporte" alt="Foto del reporte" style="max-width:100%;border-radius:6px">`;
  }
  const html = plantilla(
    `Nuevo reporte ${r.numero}`,
    `<table cellpadding="0" cellspacing="0" style="font-size:14px">
      ${fila('Número', r.numero)}${fila('Categoría', esc(etiqueta(r)))}${fila('Descripción', esc(r.descripcion))}
      ${fila('Referencia', esc(r.direccion))}${fila('Sector', esc(r.sector))}
      ${fila('Coordenadas', `${r.lat}, ${r.lng}`)}
      ${fila('Vecino', `${esc(r.nombre)} (${esc(r.email)})`)}${fila('Fecha', fechaLegible(r.creado_en))}
    </table>
    <p><a href="${mapa}" style="background:#15803D;color:#fff;padding:10px 16px;border-radius:5px;text-decoration:none;display:inline-block">Ver ubicación en Google Maps</a></p>
    ${htmlFoto}`
  );
  const texto = [
    `Nuevo reporte ${r.numero}`, '',
    `Categoría: ${etiqueta(r)}`, `Descripción: ${r.descripcion}`,
    `Referencia: ${r.direccion} (${r.sector})`, `Coordenadas: ${r.lat}, ${r.lng}`,
    `Google Maps: ${mapa}`, `Vecino: ${r.nombre} <${r.email}>`, `Fecha: ${fechaLegible(r.creado_en)}`,
    r.foto ? 'Foto: adjunta a este correo.' : 'Sin foto.',
  ].join('\n');

  return transporter.sendMail({
    from: config.mailFrom,
    to: config.muniEmail,
    replyTo: `${r.nombre} <${r.email}>`,
    subject: `[ReportaGT] ${r.numero} - ${etiqueta(r)} - Boca del Monte`,
    text: texto,
    html,
    attachments: adjuntos,
  });
}

// Correo 2: confirmación al vecino
async function enviarConfirmacionVecino(r) {
  const html = plantilla(
    `¡Gracias por tu reporte, ${esc(r.nombre)}!`,
    `<p>Recibimos tu reporte y ya fue enviado a la Municipalidad de Villa Canales.</p>
     <p style="font-size:26px;margin:16px 0;color:#15803D"><b>${r.numero}</b></p>
     <table cellpadding="0" cellspacing="0" style="font-size:14px">
       ${fila('Categoría', esc(etiqueta(r)))}${fila('Referencia', esc(r.direccion))}${fila('Estado', 'pendiente')}
     </table>
     <p>Guarda tu número de seguimiento. Te avisaremos por este medio cuando cambie el estado.</p>
     <p><a href="${config.baseUrl}/reportes.html">Ver todos los reportes</a></p>`
  );
  const texto = `Hola ${r.nombre},\n\nRecibimos tu reporte y lo enviamos a la Municipalidad de Villa Canales.\nNúmero de seguimiento: ${r.numero}\nCategoría: ${etiqueta(r)}\nReferencia: ${r.direccion}\nEstado: pendiente\n\nTe avisaremos cuando cambie el estado.\n\nReportaGT`;
  return transporter.sendMail({
    from: config.mailFrom, to: r.email,
    subject: `Recibimos tu reporte ${r.numero} - ReportaGT`, text: texto, html,
  });
}

// Correo 3: aviso al vecino cuando la muni cambia el estado
async function enviarCambioEstado(r) {
  const html = plantilla(
    `Tu reporte ${r.numero} cambió de estado`,
    `<p>Hola ${esc(r.nombre)}, el estado de tu reporte (${esc(etiqueta(r))}, ${esc(r.direccion)}) ahora es:</p>
     <p style="font-size:22px;margin:16px 0;color:#15803D"><b>${esc(r.estado.toUpperCase())}</b></p>
     <p><a href="${config.baseUrl}/reportes.html">Ver el mapa de reportes</a></p>`
  );
  const texto = `Hola ${r.nombre},\n\nTu reporte ${r.numero} (${etiqueta(r)}, ${r.direccion}) ahora está: ${r.estado.toUpperCase()}.\n\nReportaGT`;
  return transporter.sendMail({
    from: config.mailFrom, to: r.email,
    subject: `Tu reporte ${r.numero} está ${r.estado} - ReportaGT`, text: texto, html,
  });
}

module.exports = { enviarAMunicipalidad, enviarConfirmacionVecino, enviarCambioEstado };
