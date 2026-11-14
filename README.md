# ReportaGT

Sistema web para que los vecinos de Boca del Monte, Villa Canales, reporten problemas de su calle a la municipalidad y den seguimiento a cada reporte.

**Aplicación en línea:** https://reportagt.duckdns.org

---

## El problema

Cuando un vecino ve un bache, basura acumulada, un poste sin luz, un tragante tapado o un vehículo abandonado, no tiene una forma sencilla de avisar a la municipalidad. Ir en persona le quita tiempo, y en redes sociales el aviso se pierde. La municipalidad, por su parte, no recibe la ubicación exacta ni una foto, y el vecino nunca sabe si su reporte fue atendido.

## La solución

ReportaGT es una página web que se abre desde cualquier celular o computadora, sin descargar nada ni crear una cuenta.

1. El vecino llena un formulario de cuatro pasos: el problema, la ubicación en el mapa, sus datos y una foto.
2. El reporte se guarda y llega por correo a la municipalidad con la foto, la dirección y un enlace a Google Maps.
3. El vecino recibe un número de seguimiento, por ejemplo RGT-0001.
4. La municipalidad cambia el estado del reporte a "en proceso" o "resuelto" desde su panel.
5. El vecino recibe un correo con cada cambio y puede consultar su número en la sección Seguimiento.

## Funciones

**Para el vecino**

- Formulario por pasos con indicador de avance y validación en cada paso.
- Siete categorías: bache, basura en la calle, alumbrado público dañado, calle sin pavimentar, vehículo abandonado o dañado, tragante tapado y otro.
- Mapa para marcar el punto exacto; el sector se detecta solo.
- Foto obligatoria: en el celular se puede tomar con la cámara en el momento o elegir de la galería. Se reduce de tamaño antes de enviarse.
- Mapa público con todos los reportes, filtros por estado, categoría y sector.
- Consulta del estado con el número de seguimiento.

**Para la municipalidad**

- Panel protegido con usuario y contraseña, en el enlace MUNI del menú.
- Contadores por estado, búsqueda, filtros y detalle de cada reporte con su foto y mapa.
- Cambio de estado individual o por grupo, con aviso automático al vecino.
- Tabla "Dónde atender primero" que cruza sectores con categorías para priorizar el trabajo.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Servidor | Node.js 22 con Express |
| Páginas | HTML, CSS y JavaScript sin framework |
| Base de datos | SQLite |
| Mapas | Leaflet con OpenStreetMap |
| Correos | Nodemailer con Gmail |
| Contenedor | Docker, imagen `mirandd/reportagt` para amd64 y arm64 |
| Orquestación | Kubernetes k3s en Google Cloud |
| HTTPS | cert-manager con Let's Encrypt |

## Arquitectura

```
Vecino / Municipalidad
        │  HTTPS
        ▼
Ingress Traefik ──> Service ──> Pod reportagt: Node.js + Express
                                    │
                                    ├──> SQLite ──────┐
                                    ├──> Fotos ───────┴──> Volumen persistente 1 Gi
                                    ├──> Gmail ──> correos al vecino y a la municipalidad
                                    └──> Secret ──> contraseñas y configuración
```

## Estructura del repositorio

```
server.js                punto de entrada del servidor
src/
  config.js              configuración, categorías y sectores
  db.js                  base de datos y tabla de reportes
  routes.js              API: validación, guardado y envío de correos
  auth.js                inicio de sesión del personal municipal
  mailer.js              plantillas de los tres correos
  seed.js                carga 8 reportes de ejemplo
public/                  páginas: reportar, reportes, seguimiento, login y panel MUNI
k8s/                     manifiestos para el clúster en la nube
k8s-local/               manifiestos para Kubernetes de Docker Desktop
tests/                   pruebas automáticas y verificación en producción
docs/                    documentos de diseño, diagramas y mockups
Dockerfile               imagen de producción en dos etapas
```

## Ejecutar en la computadora

Requisitos: Node.js 22 o superior y Docker.

```
npm install
cp .env.example .env
docker run -d --name reportagt-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
npm run seed
npm start
```

- Aplicación: http://localhost:3000
- Panel MUNI: http://localhost:3000/admin.html
- Correos de prueba: http://localhost:8025

Mailpit recibe los correos de forma local para no enviar correos reales mientras se desarrolla. `npm run seed` carga 8 reportes de ejemplo sin foto y no envía correos.

## Despliegue en Kubernetes

| Recurso | Archivo | Función |
|---|---|---|
| Deployment | `k8s/02-deployment.yaml` | Mantiene el pod de la aplicación funcionando, con pruebas de salud y límites de CPU y memoria |
| PersistentVolumeClaim | `k8s/00-pvc.yaml` | Disco de 1 Gi para la base de datos y las fotos |
| Secret | `k8s/crear-secret.sh` | Contraseñas y configuración, creadas desde el `.env` sin subirlas al repositorio |
| Service | `k8s/03-service.yaml` | Dirección interna estable hacia el pod |
| Ingress | `k8s/04-ingress.yaml` | Dominio público con certificado HTTPS |

Publicar una versión nueva:

```
docker buildx build --platform linux/amd64,linux/arm64 -t mirandd/reportagt:latest --push .
./k8s/crear-secret.sh
kubectl apply -f k8s/
kubectl rollout restart deployment/reportagt
kubectl rollout status deployment/reportagt
```

Para probarlo en Docker Desktop con Kubernetes activado:

```
./k8s-local/crear-secret-local.sh
kubectl apply -f k8s-local/
kubectl port-forward -n reportagt svc/reportagt 8080:8080
```

### Persistencia y resiliencia

Los reportes y las fotos no se guardan dentro del contenedor sino en un volumen persistente. Si el pod se cae o se reinicia, Kubernetes crea uno nuevo que se conecta al mismo disco y no se pierde información.

Se comprobó borrando el pod a propósito: Kubernetes levantó uno nuevo en unos 30 segundos y todos los reportes seguían disponibles.

La aplicación usa una sola réplica con estrategia Recreate, porque SQLite admite un solo proceso escribiendo a la vez.

## Seguridad

- Conexión cifrada con HTTPS y certificado renovado automáticamente.
- Panel MUNI y cambios de estado protegidos con usuario y contraseña.
- Sesión en cookie firmada, inaccesible desde JavaScript y válida por 8 horas.
- Bloqueo de 15 minutos tras 5 intentos fallidos de inicio de sesión.
- Validación de todos los datos en el servidor: nombre y apellido, correo con dominio existente, ubicación dentro de Guatemala y foto obligatoria.
- Las fotos pierden sus metadatos, como la ubicación GPS, antes de subirse.
- El correo del vecino nunca se muestra en la parte pública.
- Consultas a la base de datos parametrizadas y texto del usuario escapado.
- Contraseñas guardadas en un Secret de Kubernetes, fuera del código.
- El contenedor corre sin permisos de administrador.

## Pruebas

```
npm test
npm run verificar
npm run resiliencia
```

- `npm test` levanta un servidor con una base temporal y prueba la API, el inicio de sesión, los límites de uso y el envío de correos. Necesita Mailpit encendido.
- `npm run verificar` revisa la aplicación publicada: que esté en línea, que rechace datos inválidos y que el panel esté protegido. No crea reportes ni envía correos.
- `npm run resiliencia` hace lo mismo y además borra el pod, mide cuánto tarda en volver y confirma que no se perdieron reportes.

## API

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/reportes` | Crea un reporte con foto y envía los correos |
| GET | `/api/reportes` | Lista pública de reportes |
| PATCH | `/api/reportes/:id/estado` | Cambia el estado y avisa al vecino; requiere sesión |
| GET | `/api/resumen` | Conteo por sector y categoría de los reportes sin resolver |
| GET | `/api/seguimiento/:numero` | Estado de un reporte, sin datos personales |
| GET | `/api/config` | Categorías, estados y sectores |
| POST | `/api/login` | Inicio de sesión del personal |
| POST | `/api/logout` | Cierre de sesión |

## Limitaciones y mejoras pendientes

- Una sola cuenta para el personal municipal, sin roles ni recuperación de contraseña.
- No se confirma el correo del vecino con un enlace y no hay límite de reportes por persona.
- Una sola réplica: durante un reinicio la página deja de responder cerca de un minuto. Para escalar se recomienda migrar a PostgreSQL.
- No hay copias de respaldo automáticas de la base de datos.

## Autor

Daniel Alexander Miranda Castillo · Carné 7690-22-17930

Seminario de Tecnologías de Información · Universidad Mariano Gálvez de Guatemala

## Licencia

MIT. Ver el archivo `LICENSE`.
