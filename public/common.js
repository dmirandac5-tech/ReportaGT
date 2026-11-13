// Código compartido por todas las páginas.

// Centro del mapa: Boca del Monte, Villa Canales
const CENTRO = [14.5459, -90.527];

// Un color por categoría (para pines y leyenda)
const COLORES = {
  'Bache': '#e67e22',
  'Basura en la calle': '#7d6608',
  'Alumbrado público dañado': '#f1c40f',
  'Calle sin pavimentar': '#8e44ad',
  'Vehículo abandonado o dañado': '#c0392b',
  'Tragante tapado': '#2980b9',
  'Otro': '#7f8c8d',
};

// Estados: texto + icono + clase (el color nunca es la única señal)
const ESTADOS = {
  'pendiente': { texto: 'Pendiente', icono: '○', clase: 'pendiente' },
  'en proceso': { texto: 'En proceso', icono: '◐', clase: 'en-proceso' },
  'resuelto': { texto: 'Resuelto', icono: '✔', clase: 'resuelto' },
};

// Escapa texto del usuario antes de ponerlo en HTML
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : s;
  return d.innerHTML;
}

// Barra de navegación igual en todas las páginas
function pintarNav(activa) {
  const links = [['index.html', 'Reportar'], ['reportes.html', 'Reportes'], ['seguimiento.html', 'Seguimiento'], ['admin.html', 'Personal de la muni']];
  document.querySelector('header').innerHTML = `<a class="logo" href="/"><img src="/img/reportagt-logo.svg" alt="ReportaGT"></a>
    <nav aria-label="Principal">${links.map(([u, t]) =>
      `<a href="/${u}" ${u === activa ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
}

// Crea el mapa base con OpenStreetMap
function crearMapa(id) {
  const mapa = L.map(id).setView(CENTRO, 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap',
  }).addTo(mapa);
  return mapa;
}

// Pin de color según la categoría
function iconoPin(categoria, activo) {
  const t = activo ? 24 : 16;
  return L.divIcon({ className: '', iconSize: [t, t],
    html: `<div class="pin ${activo ? 'activo' : ''}" style="background:${COLORES[categoria] || '#555'}"></div>` });
}

// Insignia de estado accesible (icono + texto + color); no es un botón
function insignia(estado) {
  const e = ESTADOS[estado] || ESTADOS.pendiente;
  return `<span class="insignia ${e.clase}"><span aria-hidden="true">${e.icono}</span>${e.texto}</span>`;
}

const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
const fechaHora = (iso) => new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });

// Antigüedad en lenguaje simple: "hace 3 días"
function hace(iso) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
  if (min < 60) return 'hace ' + (min <= 1 ? 'un momento' : min + ' min');
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  const m = Math.floor(d / 30);
  return `hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
}

// Nombre de la categoría; si es "Otro", muestra lo que escribió el vecino
const nombreCategoria = (r) => (r.categoria === 'Otro' && r.categoria_otro ? 'Otro: ' + r.categoria_otro : r.categoria);

// --- Sectores ---
// Devuelve el nombre del sector donde cae un punto (zonas viene de /api/config)
function sectorDe(zonas, lat, lng) {
  return Object.keys(zonas).find((n) => {
    const [sur, oeste, norte, este] = zonas[n];
    return lat >= sur && lat < norte && lng >= oeste && lng < este;
  }) || null;
}

// Se desplaza con animación al centro de un sector y se acerca bastante (zoom 17)
function volarASector(mapa, zonas, nombre) {
  const [sur, oeste, norte, este] = zonas[nombre];
  mapa.setView([(sur + norte) / 2, (oeste + este) / 2], 17, { animate: true, duration: 1.2 });
}

// Tabla "Dónde atender primero": sector x categoría, más rojo = más urgente
function tablaCalor(resumen) {
  const cats = Object.keys(COLORES);
  const sectores = [...new Set(resumen.porSector.map((x) => x.sector))].sort();
  if (!sectores.length) return '<p class="vacio">No hay reportes sin resolver. ¡Buen trabajo!</p>';
  const cuenta = (s, c) => (resumen.porSector.find((x) => x.sector === s && x.categoria === c) || {}).total || 0;
  const maximo = Math.max(1, ...resumen.porSector.map((x) => x.total));
  return `<div class="scroll-x"><table><thead><tr><th>Sector</th>${cats.map((c) => `<th>${esc(c)}</th>`).join('')}<th>Total</th></tr></thead><tbody>` +
    sectores.map((s) => {
      const total = cats.reduce((a, c) => a + cuenta(s, c), 0);
      return `<tr><td><b>${esc(s)}</b></td>` + cats.map((c) => {
        const n = cuenta(s, c);
        return `<td class="calor" style="background:rgba(192,57,43,${n ? 0.15 + 0.7 * n / maximo : 0})">${n || ''}</td>`;
      }).join('') + `<td class="calor">${total}</td></tr>`;
    }).join('') + '</tbody></table></div>';
}
