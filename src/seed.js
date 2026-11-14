// Datos de demo: npm run seed. Inserta reportes de ejemplo SIN enviar correos.
const { db } = require('./db');
const { sectorDe } = require('./config');

if (db.prepare("SELECT COUNT(*) AS n FROM reportes WHERE email LIKE '%@demo.test'").get().n > 0) {
  console.log('Los datos de demo ya existen. Borra reportagt.db si quieres reiniciarlos.');
  process.exit(0);
}

const hace = (dias, horas = 0) => new Date(Date.now() - (dias * 24 + horas) * 3600 * 1000).toISOString();

// [categoria, descripcion, nombre, direccion, sector, lat, lng, estado, diasAtras]
const demo = [
  ['Bache', 'Bache grande que daña los carros, ya se acumula agua cuando llueve.', 'María López', 'Frente a la tienda Doña Lety', 'Sector 4', 14.5481, -90.5262, 'resuelto', 9],
  ['Basura en la calle', 'Tiraron escombros y bolsas en el terreno baldío.', 'José Ramírez', 'Detrás de la escuela', 'Sector 2', 14.5537, -90.5249, 'resuelto', 8],
  ['Alumbrado público dañado', 'El poste lleva dos semanas sin luz, la calle queda muy oscura en la noche.', 'Lucía Hernández', 'Frente a la iglesia', 'Sector 3', 14.5426, -90.5320, 'resuelto', 7],
  ['Tragante tapado', 'El tragante está lleno de basura y cuando llueve el agua se mete a las casas.', 'Rosa Girón', 'Esquina de la cancha de fútbol', 'Sector 5', 14.5399, -90.5275, 'en proceso', 5],
  ['Bache', 'Hundimiento de la calle después de la lluvia, es peligroso para motos.', 'Carlos Pérez', 'Entrada principal, junto al salón comunal', 'Sector 1', 14.5518, -90.5298, 'en proceso', 4],
  ['Vehículo abandonado o dañado', 'Carro abandonado hace un mes, ya no tiene llantas y ocupa medio carril.', 'Miguel Santos', 'Callejón detrás de la tienda La Esperanza', 'Sector 4', 14.5470, -90.5288, 'en proceso', 3],
  ['Basura en la calle', 'Basura acumulada hace una semana en la esquina, huele muy mal.', 'Ana Morales', 'Esquina del mercadito', 'Sector 6', 14.5440, -90.5230, 'pendiente', 2],
  ['Alumbrado público dañado', 'Tres focos seguidos apagados en la bajada.', 'Pedro Castillo', 'Bajada hacia el río', 'Sector 5', 14.5399, -90.5270, 'pendiente', 1],
];

const insertar = db.prepare(`INSERT INTO reportes
  (categoria, descripcion, nombre, email, direccion, sector, lat, lng, foto, estado, creado_en, actualizado_en)
  VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?)`);

db.transaction(() => {
  demo.forEach(([cat, desc, nom, dir, sec, lat, lng, est, dias], i) => {
    const fecha = hace(dias, i);
    // Los atendidos se actualizaron días después de crearse; los pendientes siguen igual
    const actualizado = est === 'pendiente' ? fecha : hace(Math.max(dias - (est === 'resuelto' ? 3 : 1), 0), i);
    // El sector sale de las coordenadas, así el mapa y la tabla siempre coinciden
    insertar.run(cat, desc, nom, `vecino${i + 1}@demo.test`, dir, sectorDe(lat, lng) || sec, lat, lng, est, fecha, actualizado);
  });
})();

console.log(`Listo: ${demo.length} reportes de demo creados.`);
