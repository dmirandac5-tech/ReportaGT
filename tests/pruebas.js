// Pruebas automáticas de ReportaGT: node tests/pruebas.js
// Levanta su PROPIO servidor con una base temporal (no toca reportagt.db ni los reportes reales)
// y usa Mailpit (localhost:8025) para comprobar que los correos llegan. Requiere Mailpit encendido.
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PUERTO = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PUERTO}`;
const MAILPIT = process.env.MAILPIT_URL || 'http://localhost:8025';
const sufijo = Date.now();
const MUNI = `muni-prueba-${sufijo}@villacanales.test`;
const VECINO = `vecino-prueba-${sufijo}@test.test`;
const ADMIN = { usuario: 'admin-prueba', clave: 'clave-de-prueba-123' };
const dbTemporal = path.join(os.tmpdir(), `reportagt-prueba-${sufijo}.db`);

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ✔', nombre); }
  catch (e) { fallaron++; console.log('  ✘', nombre, '\n     →', e.message); }
}
const igual = (a, b, msg) => { if (a !== b) throw new Error(`${msg || 'Valor inesperado'}: se esperaba ${JSON.stringify(b)} y llegó ${JSON.stringify(a)}`); };
const cierto = (c, msg) => { if (!c) throw new Error(msg); };

const json = (ruta, opciones = {}) => fetch(BASE + ruta, { redirect: 'manual', ...opciones });
const enviarJson = (ruta, metodo, cuerpo, cookie) => json(ruta, {
  method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(cuerpo) });

function formulario(extra = {}) {
  const f = new FormData();
  Object.entries({ categoria: 'Bache', descripcion: 'Bache grande frente a la tienda', nombre: 'Vecino de Prueba', email: VECINO,
    direccion: 'Frente a la tienda X', sector: 'Sector 2', lat: '14.5481', lng: '-90.5262', ...extra }).forEach(([k, v]) => f.append(k, v));
  return f;
}

// Espera hasta que Mailpit tenga un correo que cumpla la búsqueda
async function correo(consulta) {
  for (let i = 0; i < 15; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(consulta)}`).then((x) => x.json());
    if (r.messages && r.messages.length) return r.messages[0];
    await new Promise((ok) => setTimeout(ok, 300));
  }
  return null;
}

async function main() {
  // Servidor de pruebas aislado (SMTP siempre a Mailpit local, nunca a un Gmail real)
  const servidor = spawn('node', ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env,
    PORT: PUERTO, DB_FILE: dbTemporal, MUNI_EMAIL: MUNI, SMTP_HOST: 'localhost', SMTP_PORT: '1025', SMTP_SECURE: 'false',
    SMTP_USER: '', SMTP_PASS: '', ADMIN_USER: ADMIN.usuario, ADMIN_PASS: ADMIN.clave, SESSION_SECRET: 'secreto-de-prueba' }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 30; i++) { try { await fetch(BASE + '/api/config'); break; } catch (e) { await new Promise((ok) => setTimeout(ok, 200)); } }
    console.log(`Servidor de pruebas en ${BASE} (base temporal)\n`);

    console.log('Reportes y validación');
    await prueba('la configuración trae 5 categorías (incluye Otro) y 6 sectores con zonas', async () => {
      const c = await json('/api/config').then((r) => r.json());
      igual(c.categorias.length, 5); cierto(c.categorias.includes('Otro'), 'falta Otro'); igual(c.sectores.length, 6); igual(Object.keys(c.zonas).length, 6);
    });
    await prueba('datos inválidos devuelven 400 con errores claros', async () => {
      const r = await json('/api/reportes', { method: 'POST', body: formulario({ categoria: 'Robo', email: 'x', lat: '' }) });
      igual(r.status, 400); cierto((await r.json()).errores.length >= 3, 'faltan mensajes de error');
    });
    await prueba('"Otro" sin explicar el problema se rechaza', async () => {
      igual((await json('/api/reportes', { method: 'POST', body: formulario({ categoria: 'Otro' }) })).status, 400);
    });
    let numero;
    await prueba('un reporte válido se guarda y recibe número RGT-0001', async () => {
      const r = await json('/api/reportes', { method: 'POST', body: formulario({ categoria: 'Otro', categoria_otro: 'Tapadera de drenaje rota' }) });
      igual(r.status, 201); const d = await r.json(); numero = d.numero;
      cierto(/^RGT-\d{4}$/.test(numero), 'formato de número incorrecto: ' + numero); igual(d.avisos.length, 0, 'no debía haber avisos de correo');
    });
    await prueba('la lista pública no expone el correo del vecino', async () => {
      const texto = await json('/api/reportes').then((r) => r.text());
      cierto(!texto.includes(VECINO) && !texto.includes('"email"'), 'la API pública devolvió el correo');
      cierto(texto.includes('Tapadera de drenaje rota'), 'falta el texto de "Otro"');
    });

    console.log('\nCorreos (Mailpit)');
    await prueba('llega el correo a la municipalidad con el asunto correcto', async () => {
      const m = await correo(`to:${MUNI}`); cierto(m, `no llegó correo a ${MUNI}. ¿Mailpit está encendido?`);
      cierto(m.Subject.startsWith(`[ReportaGT] ${numero} - Otro: Tapadera de drenaje rota`), 'asunto inesperado: ' + m.Subject);
    });
    await prueba('llega la confirmación al vecino con su número', async () => {
      const m = await correo(`to:${VECINO}`); cierto(m, 'no llegó la confirmación'); cierto(m.Subject.includes(numero), 'falta el número en el asunto');
    });

    console.log('\nSeguimiento del vecino');
    await prueba('se consulta por RGT-0001 y por el número suelto, sin datos personales', async () => {
      for (const n of [numero, '1', 'rgt1']) {
        const t = await json('/api/seguimiento/' + n).then((r) => r.text());
        cierto(t.includes('"estado":"pendiente"') && t.includes('"sector":"Sector 2"'), 'respuesta incompleta para ' + n);
        cierto(!t.includes('Vecino de Prueba') && !t.includes(VECINO), 'expone datos del vecino');
      }
    });
    await prueba('un número que no existe o inválido devuelve 404', async () => {
      igual((await json('/api/seguimiento/RGT-9999')).status, 404); igual((await json('/api/seguimiento/hola')).status, 404);
    });

    console.log('\nAcceso del personal');
    await prueba('sin sesión: panel redirige, y la API de estado y /admin/yo dan 401', async () => {
      const p = await json('/admin.html'); igual(p.status, 302); cierto(p.headers.get('location').includes('/login.html'), 'no redirige al login');
      igual((await enviarJson('/api/reportes/1/estado', 'PATCH', { estado: 'resuelto' })).status, 401);
      igual((await json('/api/admin/yo')).status, 401);
    });
    await prueba('una cookie falsificada no sirve', async () => {
      igual((await json('/admin.html', { headers: { Cookie: 'reportagt_sesion=admin|9999999999999|abc' } })).status, 302);
    });
    await prueba('contraseña incorrecta da 401', async () => {
      igual((await enviarJson('/api/login', 'POST', { usuario: ADMIN.usuario, clave: 'mala' })).status, 401);
    });
    let cookie;
    await prueba('con usuario y contraseña correctos se abre la sesión', async () => {
      const r = await enviarJson('/api/login', 'POST', ADMIN); igual(r.status, 200);
      cookie = r.headers.get('set-cookie').split(';')[0]; cierto(cookie.startsWith('reportagt_sesion='), 'no entregó cookie');
      igual((await json('/admin.html', { headers: { Cookie: cookie } })).status, 200);
      igual((await json('/api/admin/yo', { headers: { Cookie: cookie } }).then((x) => x.json())).usuario, ADMIN.usuario);
    });
    await prueba('el personal cambia el estado y el vecino recibe el correo', async () => {
      const r = await enviarJson('/api/reportes/1/estado', 'PATCH', { estado: 'en proceso' }, cookie);
      igual(r.status, 200); const d = await r.json(); igual(d.estado, 'en proceso'); igual(d.avisos.length, 0);
      const m = await correo(`to:${VECINO} subject:"en proceso"`); cierto(m, 'no llegó el correo del cambio de estado');
      const s = await json('/api/seguimiento/' + numero).then((x) => x.json()); igual(s.estado, 'en proceso');
    });
    await prueba('estado inválido da 400 y reporte inexistente da 404', async () => {
      igual((await enviarJson('/api/reportes/1/estado', 'PATCH', { estado: 'raro' }, cookie)).status, 400);
      igual((await enviarJson('/api/reportes/999/estado', 'PATCH', { estado: 'resuelto' }, cookie)).status, 404);
    });
    await prueba('cerrar sesión invalida el acceso', async () => {
      const r = await enviarJson('/api/logout', 'POST', {}, cookie); igual(r.status, 200);
      cierto(/Max-Age=0/.test(r.headers.get('set-cookie')), 'no borró la cookie');
    });

    console.log('\nPáginas');
    await prueba('las páginas públicas cargan', async () => {
      for (const p of ['/', '/index.html', '/reportes.html', '/seguimiento.html', '/login.html']) igual((await json(p)).status, 200, p);
    });

    console.log('\nLímites de uso');
    await prueba('tras 5 contraseñas malas se bloquea el login (429)', async () => {
      let ultimo; for (let i = 0; i < 6; i++) ultimo = (await enviarJson('/api/login', 'POST', { usuario: ADMIN.usuario, clave: 'x' + i })).status;
      igual(ultimo, 429);
    });
    await prueba('el seguimiento limita las consultas por IP (429)', async () => {
      let ultimo; for (let i = 0; i < 35; i++) ultimo = (await json('/api/seguimiento/1')).status;
      igual(ultimo, 429);
    });
  } finally {
    servidor.kill();
    for (const s of ['', '-shm', '-wal']) fs.rmSync(dbTemporal + s, { force: true });
  }
  console.log(`\n${pasaron} pasaron, ${fallaron} fallaron`);
  process.exit(fallaron ? 1 : 0);
}
main();
