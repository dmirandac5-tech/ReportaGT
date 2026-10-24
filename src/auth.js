// Acceso del personal de la municipalidad: usuario y contraseña del .env,
// sesión guardada en una cookie firmada (sin base de datos ni librerías extra).
const crypto = require('crypto');
const config = require('./config');

const DURACION_MS = 8 * 60 * 60 * 1000; // la sesión dura 8 horas
const NOMBRE_COOKIE = 'reportagt_sesion';

// Firma un texto con el secreto del servidor (si alguien cambia la cookie, la firma ya no coincide)
const firmar = (texto) => crypto.createHmac('sha256', config.sessionSecret).update(texto).digest('hex');

// Compara dos textos sin dar pistas por el tiempo de respuesta
function iguales(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Lee una cookie de la petición
function leerCookie(req, nombre) {
  const par = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(nombre + '='));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
}

// ¿La petición trae una sesión válida y vigente?
function usuarioActual(req) {
  const valor = leerCookie(req, NOMBRE_COOKIE);
  if (!valor) return null;
  const [usuario, expira, firma] = valor.split('|');
  if (!usuario || !expira || !firma) return null;
  if (!iguales(firma, firmar(`${usuario}|${expira}`))) return null;
  if (Number(expira) < Date.now()) return null;
  return usuario;
}

// Intentos fallidos por IP: 5 cada 15 minutos (frena a quien adivina contraseñas)
const intentos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
function bloqueado(ip) {
  const i = intentos.get(ip);
  return !!i && i.conteo >= 5 && Date.now() - i.desde < VENTANA_MS;
}
function anotarFallo(ip) {
  const i = intentos.get(ip);
  if (!i || Date.now() - i.desde >= VENTANA_MS) intentos.set(ip, { conteo: 1, desde: Date.now() });
  else i.conteo++;
}

// POST /api/login
function login(req, res) {
  const ip = req.ip;
  if (bloqueado(ip)) return res.status(429).json({ ok: false, errores: ['Demasiados intentos. Espera 15 minutos.'] });
  const { usuario, clave } = req.body || {};
  // Si el .env no tiene usuario y clave, el acceso queda deshabilitado
  const configurado = config.adminUser && config.adminPass;
  if (!configurado || !usuario || !clave || !iguales(usuario, config.adminUser) || !iguales(clave, config.adminPass)) {
    anotarFallo(ip);
    return res.status(401).json({ ok: false, errores: ['Usuario o contraseña incorrectos.'] });
  }
  intentos.delete(ip);
  const expira = Date.now() + DURACION_MS;
  const valor = `${config.adminUser}|${expira}|${firmar(`${config.adminUser}|${expira}`)}`;
  res.setHeader('Set-Cookie', `${NOMBRE_COOKIE}=${encodeURIComponent(valor)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DURACION_MS / 1000}`);
  res.json({ ok: true });
}

// POST /api/logout
function logout(req, res) {
  res.setHeader('Set-Cookie', `${NOMBRE_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ ok: true });
}

// Protege una API: sin sesión responde 401
function requiereAdminApi(req, res, next) {
  if (usuarioActual(req)) return next();
  res.status(401).json({ ok: false, errores: ['Debes iniciar sesión como personal de la municipalidad.'] });
}

// Protege una página: sin sesión manda al login
function requiereAdminPagina(req, res, next) {
  if (usuarioActual(req)) return next();
  res.redirect('/login.html');
}

module.exports = { login, logout, usuarioActual, requiereAdminApi, requiereAdminPagina };
