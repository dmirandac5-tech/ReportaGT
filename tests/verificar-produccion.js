// Verificación de ReportaGT en producción: node tests/verificar-produccion.js [--resiliencia]
//
// Comprueba contra la app publicada que la solución funciona y está protegida.
// No crea reportes ni envía correos: solo lee datos públicos y manda peticiones inválidas que el servidor debe rechazar.
// Con --resiliencia además borra el pod en Kubernetes, mide cuánto tarda en volver y revisa que no se perdieron reportes.
const { execFileSync } = require('child_process');

const BASE = (process.env.REPORTAGT_URL || 'https://reportagt.duckdns.org').replace(/\/$/, '');
const CONTEXTO = process.env.KUBE_CONTEXT || 'dmirandac5';
const NAMESPACE = 'dmirandac5';

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { const detalle = await fn(); pasaron++; console.log('  ✔', nombre + (detalle ? `  (${detalle})` : '')); }
  catch (e) { fallaron++; console.log('  ✘', nombre, '\n     →', e.message); }
}
const cierto = (c, msg) => { if (!c) throw new Error(msg); };
const pedir = (ruta, opciones = {}) => fetch(BASE + ruta, { redirect: 'manual', ...opciones });

// Formulario de reporte con datos válidos; cada prueba cambia lo que quiere romper
function formulario(cambios = {}) {
  const f = new FormData();
  Object.entries({ categoria: 'Bache', descripcion: 'Prueba automática de validación', nombre: 'Prueba Automática',
    email: 'prueba@gmail.com', direccion: 'Frente a la tienda', sector: 'Sector 1', lat: '14.55', lng: '-90.53', ...cambios })
    .forEach(([k, v]) => f.append(k, v));
  return f;
}
const kubectl = (...args) => execFileSync('kubectl', ['--context', CONTEXTO, '-n', NAMESPACE, ...args], { encoding: 'utf8' }).trim();
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function main() {
  console.log(`Verificando ReportaGT en ${BASE}\n`);

  console.log('La aplicación está en línea');
  let versionNueva = false;
  await prueba('la página principal carga por HTTPS', async () => {
    const r = await pedir('/');
    cierto(r.status === 200, `respondió ${r.status}`);
    const html = await r.text();
    cierto(html.includes('ReportaGT'), 'la página no muestra ReportaGT');
    versionNueva = html.includes('btn-camara');   // la versión con foto obligatoria
    return 'HTTP 200';
  });
  let config;
  await prueba('ofrece las categorías de problemas de la calle', async () => {
    config = await pedir('/api/config').then((r) => r.json());
    for (const c of ['Bache', 'Basura en la calle', 'Alumbrado público dañado', 'Tragante tapado', 'Vehículo abandonado o dañado'])
      cierto(config.categorias.includes(c), `falta la categoría ${c}`);
    return `${config.categorias.length} categorías, ${config.sectores.length} sectores`;
  });
  let reportes = [];
  await prueba('los reportes están guardados en la base de datos en la nube', async () => {
    reportes = await pedir('/api/reportes').then((r) => r.json());
    cierto(Array.isArray(reportes), 'la lista no es válida');
    const estados = reportes.reduce((a, r) => ({ ...a, [r.estado]: (a[r.estado] || 0) + 1 }), {});
    return `${reportes.length} reportes · ` + (Object.entries(estados).map(([e, n]) => `${n} ${e}`).join(', ') || 'sin reportes aún');
  });

  // En una versión anterior, sin foto obligatoria, estas pruebas crearían reportes reales y enviarían correos
  if (!versionNueva) {
    console.log('\n  ! La versión publicada todavía no exige foto. Se omiten las pruebas de validación para no crear reportes reales.');
    console.log('    Publica la última imagen y vuelve a correr la verificación.');
  } else {
  console.log('\nLos datos que llegan a la municipalidad están completos');
  await prueba('un reporte sin foto se rechaza', async () => {
    const r = await pedir('/api/reportes', { method: 'POST', body: formulario() });
    const d = await r.json();
    cierto(r.status === 400 && d.errores.some((e) => /foto/i.test(e)), `respondió ${r.status}`);
    return d.errores.join(' ');
  });
  await prueba('un nombre que no es nombre y apellido se rechaza', async () => {
    const r = await pedir('/api/reportes', { method: 'POST', body: formulario({ nombre: 'Juan123' }) });
    const d = await r.json();
    cierto(r.status === 400 && d.errores.some((e) => /nombre/i.test(e)), `respondió ${r.status}`);
    return 'HTTP 400';
  });
  await prueba('un correo mal escrito se rechaza', async () => {
    const r = await pedir('/api/reportes', { method: 'POST', body: formulario({ email: 'juan@correo' }) });
    const d = await r.json();
    cierto(r.status === 400 && d.errores.some((e) => /correo/i.test(e)), `respondió ${r.status}`);
    return 'HTTP 400';
  });
  await prueba('una ubicación fuera de Guatemala se rechaza', async () => {
    const r = await pedir('/api/reportes', { method: 'POST', body: formulario({ lat: '40.4', lng: '-3.7' }) });
    const d = await r.json();
    cierto(r.status === 400 && d.errores.some((e) => /ubicación|mapa/i.test(e)), `respondió ${r.status}`);
    return 'HTTP 400';
  });

  }

  console.log('\nLa información está protegida');
  await prueba('la lista pública no muestra el correo de los vecinos', async () => {
    const texto = JSON.stringify(reportes);
    cierto(!texto.includes('"email"'), 'la API pública devolvió el correo de los vecinos');
    return 'ningún correo expuesto';
  });
  await prueba('el panel MUNI exige iniciar sesión', async () => {
    const r = await pedir('/admin');
    cierto(r.status === 302 && /login/.test(r.headers.get('location') || ''), `respondió ${r.status}`);
    return 'redirige al login';
  });
  await prueba('sin sesión no se puede cambiar el estado de un reporte', async () => {
    const r = await pedir('/api/reportes/1/estado', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"estado":"resuelto"}' });
    cierto(r.status === 401, `respondió ${r.status}`);
    return 'HTTP 401';
  });
  // No se prueba una contraseña incorrecta: cada intento fallido cuenta para el bloqueo de 15 minutos del panel

  if (process.argv.includes('--resiliencia')) {
    console.log('\nResiliencia en Kubernetes');
    await prueba('si el pod se cae, Kubernetes lo reemplaza y no se pierden reportes', async () => {
      const antes = reportes.length;
      const podViejo = kubectl('get', 'pods', '-l', 'app=reportagt', '-o', 'jsonpath={.items[0].metadata.name}');
      console.log(`     borrando el pod ${podViejo}...`);
      const inicio = Date.now();
      kubectl('delete', 'pod', '-l', 'app=reportagt', '--wait=false');
      await pausa(3000);
      let enLinea = false;
      while (Date.now() - inicio < 180000) {
        try { const r = await pedir('/api/config'); if (r.status === 200) { enLinea = true; break; } } catch (e) { /* sigue reiniciando */ }
        await pausa(1000);
      }
      cierto(enLinea, 'la aplicación no volvió en 3 minutos');
      const segundos = Math.round((Date.now() - inicio) / 1000);
      const podNuevo = kubectl('get', 'pods', '-l', 'app=reportagt', '--field-selector=status.phase=Running', '-o', 'jsonpath={.items[*].metadata.name}');
      const despues = (await pedir('/api/reportes').then((r) => r.json())).length;
      cierto(despues >= antes, `antes había ${antes} reportes y ahora ${despues}`);
      return `volvió en ${segundos} s con el pod ${podNuevo}; reportes antes ${antes}, después ${despues}`;
    });
  }

  console.log(`\n${pasaron} pasaron, ${fallaron} fallaron`);
  process.exit(fallaron ? 1 : 0);
}
main().catch((e) => { console.error('No se pudo completar la verificación:', e.message); process.exit(1); });
