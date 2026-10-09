// Datos de demo: npm run seed. Inserta reportes de ejemplo SIN enviar correos.
const { db } = require('./db');

if (db.prepare("SELECT COUNT(*) AS n FROM reportes WHERE email LIKE '%@demo.test'").get().n > 0) {
  console.log('Los datos de demo ya existen. Borra reportagt.db si quieres reiniciarlos.');
  process.exit(0);
}

const hace = (dias, horas = 0) => new Date(Date.now() - (dias * 24 + horas) * 3600 * 1000).toISOString();

// [categoria, descripcion, nombre, direccion, sector, lat, lng, estado, diasAtras]
const demo = [
  ['Bache', 'Bache grande que daña los carros, ya se acumula agua cuando llueve.', 'María López', 'Frente a la tienda Doña Lety', 'Sector 4', 14.5012, -90.5301, 'pendiente', 1],
  ['Bache', 'Hundimiento de la calle después de la lluvia, es peligroso para motos.', 'Carlos Pérez', 'Entrada principal, junto al salón comunal', 'Sector 1', 14.5035, -90.5338, 'en proceso', 4],
  ['Basura en la calle', 'Basura acumulada hace una semana en la esquina, huele muy mal.', 'Ana Morales', 'Esquina de la cancha de fútbol', 'Sector 4', 14.5001, -90.5289, 'pendiente', 2],
  ['Basura en la calle', 'Tiraron escombros y bolsas en el terreno baldío.', 'José Ramírez', 'Detrás de la escuela', 'Sector 2', 14.5058, -90.5262, 'resuelto', 9],
  ['Alumbrado público dañado', 'El poste lleva dos semanas sin luz, la calle queda muy oscura en la noche.', 'Lucía Hernández', 'Frente a la iglesia', 'Sector 3', 14.4988, -90.5317, 'pendiente', 3],
  ['Alumbrado público dañado', 'Tres focos seguidos apagados en la bajada.', 'Pedro Castillo', 'Bajada hacia el río', 'Sector 5', 14.4965, -90.5275, 'en proceso', 6],
  ['Calle sin pavimentar', 'La calle es de tierra y en invierno se vuelve lodo, los buses no entran.', 'Rosa Girón', 'Final de la calle principal, sector 6', 'Sector 6', 14.4942, -90.5352, 'pendiente', 12],
  ['Calle sin pavimentar', 'Tramo de 200 metros sin pavimento, los vecinos no pueden sacar sus carros.', 'Miguel Santos', 'Callejón detrás de la tienda La Esperanza', 'Sector 4', 14.5021, -90.5322, 'pendiente', 5],
];

const insertar = db.prepare(`INSERT INTO reportes
  (categoria, descripcion, nombre, email, direccion, sector, lat, lng, foto, estado, creado_en, actualizado_en)
  VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?)`);

db.transaction(() => {
  demo.forEach(([cat, desc, nom, dir, sec, lat, lng, est, dias], i) => {
    const fecha = hace(dias, i);
    insertar.run(cat, desc, nom, `vecino${i + 1}@demo.test`, dir, sec, lat, lng, est, fecha, fecha);
  });
})();

console.log(`Listo: ${demo.length} reportes de demo creados.`);
