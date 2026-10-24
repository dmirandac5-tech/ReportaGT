// Código compartido por todas las páginas.

// Centro del mapa: Boca del Monte, Villa Canales
const CENTRO = [14.5459, -90.527];

// Un color por categoría (para pines y leyenda)
const COLORES = {
  'Bache': '#e67e22',
  'Basura en la calle': '#7d6608',
  'Alumbrado público dañado': '#f1c40f',
  'Calle sin pavimentar': '#8e44ad',
  'Otro': '#7f8c8d',
};

// Escapa texto del usuario antes de ponerlo en HTML
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Barra de navegación igual en todas las páginas
function pintarNav(activa) {
  const links = [['index.html', 'Reportar'], ['reportes.html', 'Reportes'], ['admin.html', 'Admin (muni)']];
  document.querySelector('header').innerHTML = `<h1>ReportaGT<small>Boca del Monte, Villa Canales</small></h1>
    <nav>${links.map(([u, t]) => `<a href="/${u}" class="${u === activa ? 'activo' : ''}">${t}</a>`).join('')}</nav>`;
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
function iconoPin(categoria) {
  return L.divIcon({ className: '', iconSize: [16, 16],
    html: `<div class="pin" style="background:${COLORES[categoria] || '#555'}"></div>` });
}

const claseEstado = (e) => e.replace(' ', '-');
const fechaCorta = (iso) => new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });

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

// Nombre de la categoría; si es "Otro", muestra lo que escribió el vecino
const nombreCategoria = (r) => (r.categoria === 'Otro' && r.categoria_otro ? 'Otro: ' + r.categoria_otro : r.categoria);
