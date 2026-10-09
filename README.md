# ReportaGT (prototipo)

Los vecinos de Boca del Monte, Villa Canales reportan baches, basura, alumbrado dañado y calles sin pavimentar. Cada reporte queda guardado y llega por correo a la municipalidad con ubicación, foto y número de seguimiento (RGT-0001...).

## Cómo funciona (para explicarlo)
```
Navegador ──> Express (server.js) ──> src/routes.js ──> SQLite (reportagt.db)
                                          └──────────> src/mailer.js ──> SMTP (Mailpit / Gmail)
```
- `src/config.js` lee el `.env` · `src/db.js` crea la tabla · `src/mailer.js` arma los 3 correos · `src/routes.js` valida, guarda y envía.
- `public/` tiene las 3 páginas: `index.html` (reportar), `reportes.html` (mapa + resumen), `admin.html` (cambiar estado).
- Si falla el correo, el reporte igual se guarda y el vecino ve un aviso.

## Cómo correrlo
1. Requisitos: Node 18+ y Docker (o el binario de Mailpit).
2. `npm install`
3. `cp .env.example .env`
4. Mailpit (recibe los correos en local):
   ```
   docker run -d --name reportagt-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
   ```
   Sin Docker en Mac: `brew install mailpit && mailpit`. Otros sistemas: binarios en https://github.com/axllent/mailpit/releases
5. `npm run seed` (8 reportes de ejemplo, no envía correos)
6. `npm start`

Abrir: app http://localhost:3000 · reportes http://localhost:3000/reportes.html · admin http://localhost:3000/admin.html · correos http://localhost:8025

## Usar Gmail real
En `.env` cambia `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER`, `SMTP_PASS` (contraseña de aplicación de Google) y `MUNI_EMAIL`. No hay que tocar código.

## API
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/reportes` | Crea reporte (multipart, foto opcional) y manda 2 correos |
| GET | `/api/reportes` | Lista de reportes |
| PATCH | `/api/reportes/:id/estado` | Cambia estado y avisa al vecino |
| GET | `/api/resumen` | Conteo por sector y categoría (sin resolver) |

## Limitaciones del prototipo
Sin login (`/admin` es abierto, solo para la demo), sin límite de envíos por persona, el mapa necesita internet para los mosaicos de OpenStreetMap.
