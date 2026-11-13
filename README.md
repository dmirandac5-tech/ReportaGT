<img src="public/img/reportagt-logo.svg" alt="ReportaGT" height="60">

# ReportaGT (prototipo)

Los vecinos de Boca del Monte, Villa Canales reportan baches, basura, alumbrado dañado, calles sin pavimentar, vehículos abandonados y tragantes tapados. Cada reporte queda guardado y llega por correo a la municipalidad con ubicación, foto y número de seguimiento (RGT-0001...).

## Cómo funciona (para explicarlo)
```
Navegador ──> Express (server.js) ──> src/routes.js ──> SQLite (reportagt.db)
                                          └──────────> src/mailer.js ──> SMTP (Mailpit / Gmail)
```
- `src/config.js` lee el `.env` · `src/db.js` crea la tabla · `src/mailer.js` arma los 3 correos · `src/routes.js` valida, guarda y envía.
- `public/` tiene las páginas: `index.html` (reportar, en 4 pasos), `reportes.html` (mapa, filtros y lista sincronizada), `seguimiento.html` (el vecino consulta su número), `login.html` y `admin.html` (panel de la muni).
- Todo el CSS está en `public/style.css` (variables en `:root`) y el JavaScript compartido en `public/common.js`.
- Si falla el correo, el reporte igual se guarda y el vecino ve un aviso.

## Cómo correrlo
1. Requisitos: Node 22+ (lo exige `better-sqlite3`) y Docker (o el binario de Mailpit).
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

## Despliegue en Kubernetes
La app corre en un contenedor (`Dockerfile`, imagen `mirandd/reportagt` en Docker Hub, para amd64 y arm64) y se despliega con manifiestos YAML.

```
Navegador ──> Service ──> Deployment (pod reportagt) ──> PersistentVolumeClaim
                               │                           ├── dbdata/reportagt.db  (reportes)
                               └── Secret (variables .env) └── uploads/             (fotos)
```

| Carpeta | Para qué | Qué trae |
|---|---|---|
| `k8s-local/` | Kubernetes de Docker Desktop (pruebas en la máquina) | Namespace, PVC, Deployment, Service |
| `k8s/` | Clúster k3s en la nube (namespace `dmirandac5`) | PVC, Deployment, Service, Ingress con HTTPS |

Qué hace cada pieza:
- **Deployment**: mantiene 1 pod vivo; si el pod muere, Kubernetes levanta otro. Trae `readinessProbe` y `livenessProbe` sobre `/api/config` y límites de CPU y memoria.
- **PersistentVolumeClaim (1 Gi)**: guarda la base SQLite y las fotos fuera del contenedor, así los reportes sobreviven a reinicios.
- **Secret**: usuario y clave del panel, secreto de sesión y datos SMTP. Se crea desde el `.env` con un script, nunca se sube al repositorio.
- **Service / Ingress**: exponen la app; en la nube el Ingress agrega dominio y certificado HTTPS.
- Estrategia `Recreate` y 1 réplica: SQLite admite un solo escritor y el volumen es `ReadWriteOnce`.

Levantarlo en Docker Desktop (con Kubernetes activado):
```
./k8s-local/crear-secret-local.sh
kubectl apply -f k8s-local/
kubectl get pods -n reportagt
kubectl port-forward -n reportagt svc/reportagt 8080:8080
```
Abrir http://localhost:8080

Probar la resiliencia: `kubectl delete pod -n reportagt -l app=reportagt` y luego `kubectl get pods -n reportagt`. En la prueba hecha, el pod nuevo quedó listo en unos 30 segundos y los reportes seguían ahí.

Reconstruir y publicar la imagen:
```
docker buildx build --platform linux/amd64,linux/arm64 -t mirandd/reportagt:latest --push .
kubectl rollout restart deployment/reportagt -n reportagt
```

## Acceso al panel /admin
Solo personal con usuario y contraseña puede abrir `/admin`. Se definen en `.env` (`ADMIN_USER`, `ADMIN_PASS`, `SESSION_SECRET`). La sesión dura 8 horas y tras 5 intentos fallidos se bloquea 15 minutos. Para producción conviene HTTPS y contraseñas por persona.

## Panel de la municipalidad
Resumen con contadores clicables, búsqueda, filtros (estado, categoría, sector) y orden, lista compacta con detalle en panel lateral (foto, mapa, cambio de estado), cambio por lote con aviso de cuántos correos se envían, y "Dónde atender primero". Confirmación solo al resolver. Funciona en celular (tarjetas) y con teclado (Esc cierra el detalle).

## Seguimiento para el vecino
`/seguimiento.html` (o el enlace al final del formulario): el vecino escribe RGT-0012 y ve estado, categoría, sector y fechas, sin nombre ni correo. Límite de 30 consultas cada 10 minutos por IP.

## Pruebas automáticas
```
npm test
```
Levanta su propio servidor con una base temporal (no toca `reportagt.db`) y comprueba la API, el login, los límites de uso y que los correos lleguen a Mailpit. Requiere Mailpit encendido.

## Usar Gmail real
En `.env` cambia `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER`, `SMTP_PASS` (contraseña de aplicación de Google) y `MUNI_EMAIL`. No hay que tocar código.

## API
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/reportes` | Crea reporte (multipart, foto opcional) y manda 2 correos |
| GET | `/api/reportes` | Lista de reportes |
| PATCH | `/api/reportes/:id/estado` | Cambia estado y avisa al vecino |
| GET | `/api/resumen` | Conteo por sector y categoría (sin resolver) |
| GET | `/api/seguimiento/:numero` | Estado público de un reporte (con límite por IP) |
| GET | `/api/admin/yo` | Usuario conectado (solo personal) |
| POST | `/api/login`, `/api/logout` | Sesión del personal |

## Limitaciones del prototipo
Un solo usuario de la muni (el de `.env`, sin roles ni recuperación de contraseña), sin límite de envíos por persona, el mapa necesita internet para los mosaicos de OpenStreetMap.
