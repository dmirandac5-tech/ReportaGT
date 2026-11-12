---
Titulo: "Documento de Análisis y Diseño (DAD)"
Subtitulo: "ReportaGT — Sistema de Reportes Urbanos y Delictivos"
Univerisdad: "Universidad Mariano Gálvez de Guatemala — Seminario de Tecnologías de Información"
Fehca: "Agosto 2026"
---

# Documento de Análisis y Diseño (DAD)
## ReportaGT — Sistema de Reportes Urbanos y Delictivos para Villa Canales / Boca del Monte

| Documento | Documento de Análisis y Diseño (DAD) |
|---|---|
| Proyecto | ReportaGT |
| Versión | 1.0 |
| Curso | Seminario de Tecnologías de Información |
| Alcance territorial | Villa Canales – Boca del Monte, Guatemala |

---

## Control de versiones

| Fecha | Versión | Autor | Descripción |
|---|---|---|---|
| 20/08/2026 | 1.0 | Daniel Alexander Miranda Castillo | Creación del documento |

---

## Índice

- [1. Introducción](#1-introducción)
- [2. Contexto general](#2-contexto-general)
  - [2.1. Participantes](#21-participantes)
  - [2.2. Flujo funcional de ReportaGT](#22-flujo-funcional-de-reportagt)
  - [2.3. Alcance](#23-alcance)
  - [2.4. Limitaciones](#24-limitaciones)
- [3. Requisitos funcionales y no funcionales](#3-requisitos-funcionales-y-no-funcionales)
  - [3.1. Requisitos funcionales (RF)](#31-requisitos-funcionales-rf)
  - [3.2. Requisitos no funcionales (RNF)](#32-requisitos-no-funcionales-rnf)
- [4. Diseño de alto nivel](#4-diseño-de-alto-nivel)
  - [4.1. Descripción de módulos / componentes](#41-descripción-de-módulos--componentes)
  - [4.2. Arquitectura general](#42-arquitectura-general)
- [5. Diseño de la base de datos](#5-diseño-de-la-base-de-datos)
  - [5.1. Diagrama entidad-relación](#51-diagrama-entidad-relación)
  - [5.2. Descripción de tablas principales](#52-descripción-de-tablas-principales)
- [6. Mockups del prototipo](#6-mockups-del-prototipo)
  - [6.1. Formulario de creación de reporte (Ciudadano)](#61-formulario-de-creación-de-reporte-ciudadano)
  - [6.2. Mapa público de reportes](#62-mapa-público-de-reportes)
  - [6.3. Panel de gestión (PNC / Municipalidad)](#63-panel-de-gestión-pnc--municipalidad)
- [7. Cronograma de actividades](#7-cronograma-de-actividades)
- [8. Glosario de términos](#8-glosario-de-términos)

---

## 1. Introducción

La inseguridad ciudadana y el deterioro de infraestructura urbana son dos problemas que afectan de forma cotidiana a los vecinos de Villa Canales, particularmente en el sector de Boca del Monte. Actualmente no existe un canal digital centralizado donde un vecino pueda reportar tanto un hecho delictivo (robo, asalto, extorsión) como un problema de infraestructura urbana (basura acumulada, alumbrado público dañado, baches), ni un mecanismo para que la Policía Nacional Civil (PNC) o la Municipalidad de Villa Canales le den seguimiento visible a ese reporte.

**ReportaGT** es una aplicación web que permite a los ciudadanos registrar reportes geolocalizados de dos naturalezas —delictivos y urbanos— y permite que la entidad responsable de cada tipo de reporte que actualice su estado a lo largo de un flujo de atención (*pendiente - en proceso - resuelto*), dando trazabilidad y visibilidad pública al problema reportado.

El presente documento describe el análisis de requerimientos y el diseño de la solución: participantes, alcance, requisitos funcionales y no funcionales, arquitectura de alto nivel, diseño de base de datos, mockups del prototipo y el cronograma de desarrollo.

---

## 2. Contexto general

ReportaGT es una aplicación web (SPA) consumida por tres tipos de usuario a través de un mismo frontend, que se comunica con una API REST central. Dependiendo del rol autenticado, el sistema muestra una interfaz distinta: el ciudadano ve un mapa de reportes y un formulario de creación; la PNC y la Municipalidad ven un panel de gestión con los reportes asignados a su competencia.

### 2.1. Participantes

| Iniciales | Rol | Descripción |
|---|---|---|
| CI | Ciudadano | Vecino de Villa Canales / Boca del Monte que crea y da seguimiento a sus reportes. |
| PNC | Policía Nacional Civil de Boca del monte | Recibe y gestiona reportes clasificados como delitos. |
| MUN | Municipalidad de Villa Canales de Boca del Monte | Recibe y gestiona reportes clasificados como problemas urbanos. |
| DEV | Desarrollador | Responsable del análisis, diseño e implementación del sistema. |

### 2.2. Flujo funcional de ReportaGT

El flujo transaccional principal del sistema es el siguiente:

1. El ciudadano se registra o inicia sesión y accede al mapa de reportes de su zona.
2. Crea un nuevo reporte seleccionando el tipo (delito o problema urbano), una categoría específica, una descripción, la ubicación (mediante el mapa interactivo) y, opcionalmente, adjunta una evidencia fotográfica.
3. El sistema, según la categoría seleccionada, asigna automáticamente el reporte a la entidad responsable: PNC si es un delito, Municipalidad si es un problema urbano.
4. La entidad responsable visualiza el reporte en su panel, y puede cambiar su estado: `pendiente` → `en proceso` → `resuelto` (o `rechazado`, si el reporte no procede).
5. Cada cambio de estado queda registrado en un historial, visible para el ciudadano que originó el reporte.
6. El ciudadano puede consultar en todo momento el estado de sus reportes y ver en el mapa general los reportes públicos de su comunidad.

### 2.3. Alcance

- Registro y autenticación de usuarios con 3 roles: ciudadano, PNC, municipalidad.
- Creación de reportes de tipo **delictivo** (robo, asalto, extorsión, otros) y **urbano** (basura, alumbrado público, baches, otros).
- Geolocalización del reporte mediante mapa interactivo (Leaflet + OpenStreetMap).
- Adjuntar una evidencia fotográfica por reporte (opcional).
- Asignación automática del reporte a PNC o Municipalidad según su categoría.
- Cambio de estado del reporte por parte de la entidad responsable, con historial de cambios.
- Visualización de reportes en un mapa público filtrable por tipo y estado.
- Panel de gestión para PNC y Municipalidad con listado, detalle y actualización de estado.
- Notificación in-app al ciudadano cuando cambia el estado de su reporte.

### 2.4. Limitaciones

- El sistema no sustituye canales oficiales de emergencia (PNC 110, Bomberos 122/123); es un canal complementario de reporte comunitario, no de atención inmediata.
- No se contempla en esta primera versión geolocalización automática por GPS del dispositivo móvil (se selecciona manualmente en el mapa).
- No se realizan validaciones de identidad biométrica del ciudadano; el registro es mediante correo electrónico.
- No se contempla, en esta versión, integración con sistemas internos de la PNC o de la Municipalidad (el uso de sus paneles es autónomo dentro de ReportaGT).
- El sistema no garantiza tiempos de respuesta de las entidades; solo brinda trazabilidad del estado declarado por ellas.

---

## 3. Requisitos funcionales y no funcionales

### 3.1. Requisitos funcionales (RF)

| # | Requisito |
|---|---|
| RF01 | El sistema debe permitir que un ciudadano se registre con nombre, correo y contraseña. |
| RF02 | El sistema debe permitir el inicio de sesión mediante correo y contraseña, generando un token JWT con el rol del usuario. |
| RF03 | El ciudadano debe poder crear un reporte indicando tipo (delito / urbano), categoría, descripción, ubicación en el mapa y, opcionalmente, una foto. |
| RF04 | El sistema debe asignar automáticamente el reporte a la entidad responsable (PNC o Municipalidad) según la categoría seleccionada. |
| RF05 | El ciudadano debe poder consultar el listado y el detalle de sus propios reportes, incluyendo su estado actual. |
| RF06 | El ciudadano debe poder visualizar en un mapa los reportes públicos de su zona, filtrables por tipo y estado. |
| RF07 | La PNC debe poder listar y consultar el detalle de los reportes de tipo delito asignados a su competencia. |
| RF08 | La Municipalidad debe poder listar y consultar el detalle de los reportes de tipo urbano asignados a su competencia. |
| RF09 | La PNC y la Municipalidad deben poder actualizar el estado de un reporte (`pendiente`, `en proceso`, `resuelto`, `rechazado`). |
| RF10 | El sistema debe registrar un historial de los cambios de estado de cada reporte (usuario, estado anterior, estado nuevo, fecha). |
| RF11 | El sistema debe notificar al ciudadano (dentro de la aplicación) cuando el estado de uno de sus reportes cambie. |
| RF12 | El sistema debe permitir filtrar el listado de reportes por categoría, estado y rango de fechas. |

### 3.2. Requisitos no funcionales (RNF)

| # | Requisito |
|---|---|
| RNF01 | El sistema debe estar disponible en horario 24 x 7, salvo mantenimientos programados. |
| RNF02 | Las contraseñas de los usuarios deben almacenarse cifradas (hash con salt, ej. bcrypt). |
| RNF03 | El tiempo de respuesta de las operaciones de creación y consulta de reportes no debe superar los 3 segundos bajo condiciones normales de red. |
| RNF04 | El sistema debe ser responsivo (usable desde navegador de escritorio y móvil). |
| RNF05 | El acceso a los paneles de PNC y Municipalidad debe estar restringido por rol mediante autorización en el backend (no solo ocultamiento visual). |
| RNF06 | El sistema debe manejar mensajes de error claros y orientados al usuario final, sin exponer detalles internos (stack traces, queries, etc.). |
| RNF07 | El código fuente debe versionarse en un repositorio Git, con el DAD generado desde Markdown y alojado en el mismo repositorio. |

---

## 4. Diseño de alto nivel

### 4.1. Descripción de módulos / componentes

El sistema se compone de los siguientes módulos lógicos:

- **Módulo de Autenticación y Usuarios**: registro, login, emisión y validación de tokens JWT, gestión de roles (ciudadano, PNC, municipalidad).
- **Módulo de Reportes**: creación, consulta, listado y filtrado de reportes; lógica de asignación automática a la entidad responsable según categoría.
- **Módulo de Gestión de Estado**: actualización del estado de un reporte por parte de PNC/Municipalidad y registro del historial de cambios.
- **Módulo de Notificaciones**: generación de notificaciones in-app al ciudadano cuando su reporte cambia de estado.
- **Módulo de Mapa**: integración con Leaflet/OpenStreetMap para selección de ubicación al crear un reporte y visualización de reportes en el mapa público.
- **Módulo de Almacenamiento de Evidencia**: carga y almacenamiento de la fotografía adjunta a un reporte.

### 4.2. Arquitectura general

ReportaGT sigue una arquitectura cliente-servidor de tres capas: un frontend SPA en React que se adapta según el rol del usuario autenticado, un backend API REST en Node.js/Express que centraliza la lógica de negocio y autorización, y una base de datos PostgreSQL con extensión PostGIS para el manejo eficiente de datos geoespaciales. El almacenamiento de evidencia fotográfica se maneja de forma independiente (bucket de archivos), y la geocodificación/visualización de mapas se apoya en un servicio externo gratuito (OpenStreetMap vía Leaflet).

![Arquitectura general de ReportaGT](img/arquitectura.png)

**Figura 1.** Vista de alto nivel de los componentes del sistema y su comunicación.

---

## 5. Diseño de la base de datos

### 5.1. Diagrama entidad-relación

![Diagrama entidad-relación](img/der.png)

**Figura 2.** Modelo de datos principal de ReportaGT.

### 5.2. Descripción de tablas principales

**usuarios**

| Campo | Tipo | Descripción |
|---|---|---|
| id_usuario (PK) | INT | Identificador único del usuario |
| nombre | VARCHAR | Nombre completo |
| email | VARCHAR | Correo electrónico, único |
| password_hash | VARCHAR | Contraseña cifrada |
| rol | VARCHAR | `ciudadano`, `pnc` o `municipalidad` |
| fecha_registro | DATETIME | Fecha de creación de la cuenta |

**categorias_reporte**

| Campo | Tipo | Descripción |
|---|---|---|
| id_categoria (PK) | INT | Identificador único de la categoría |
| nombre | VARCHAR | Ej: "Robo", "Alumbrado público", "Baches" |
| tipo | VARCHAR | `delito` o `urbano` |
| entidad_responsable | VARCHAR | `pnc` o `municipalidad` |

**reportes**

| Campo | Tipo | Descripción |
|---|---|---|
| id_reporte (PK) | INT | Identificador único del reporte |
| id_usuario (FK) | INT | Ciudadano que creó el reporte |
| id_categoria (FK) | INT | Categoría del reporte |
| descripcion | TEXT | Detalle del hecho reportado |
| latitud, longitud | DECIMAL | Coordenadas geográficas del reporte |
| direccion_referencia | VARCHAR | Referencia textual de la ubicación |
| estado | VARCHAR | `pendiente`, `en_proceso`, `resuelto`, `rechazado` |
| id_entidad_asignada | INT | Entidad responsable (derivado de categoría) |
| fecha_creacion | DATETIME | Fecha de creación del reporte |
| fecha_actualizacion | DATETIME | Última actualización de estado |

**evidencias**

| Campo | Tipo | Descripción |
|---|---|---|
| id_evidencia (PK) | INT | Identificador único |
| id_reporte (FK) | INT | Reporte al que pertenece |
| url_archivo | VARCHAR | Ruta/URL de la fotografía almacenada |

**historial_estado**

| Campo | Tipo | Descripción |
|---|---|---|
| id_historial (PK) | INT | Identificador único |
| id_reporte (FK) | INT | Reporte asociado |
| id_usuario (FK) | INT | Usuario (PNC/Municipalidad) que hizo el cambio |
| estado_nuevo | VARCHAR | Estado al que cambió el reporte |
| fecha | DATETIME | Fecha y hora del cambio |

---

## 6. Mockups del prototipo

![Mockup GENERAL](img/mockuo_General.png)

### 6.1. Formulario de creación de reporte (Ciudadano)

![Mockup formulario de reporte](img/mockup_reporte.png)


El ciudadano selecciona el tipo y categoría del reporte, redacta una breve descripción, ubica el incidente en el mapa y puede adjuntar una fotografía como evidencia.

### 6.2. Mapa público de reportes

![Mockup mapa de reportes](img/mockup_mapa.png)

Vista principal del ciudadano: mapa de Villa Canales / Boca del Monte con los reportes activos, filtrable por tipo (delito / urbano) y estado, con navegación inferior hacia "Mis reportes" y "Nuevo reporte".

### 6.3. Panel de gestión (PNC / Municipalidad)

![Mockup panel de gestión](img/mockup_panel.png)

Vista de la entidad responsable: listado de reportes asignados con su estado actual, y panel de detalle donde puede actualizar el estado del reporte (pendiente → en proceso → resuelto).

---

## 7. Cronograma de actividades

El proyecto se desarrolla durante el ciclo lectivo, con entrega funcional el 31 de octubre de 2026.

| Fase | Actividades | Fecha inicio | Fecha fin |
|---|---|---|---|
| 1. Análisis y diseño | Levantamiento de requisitos, DAD, mockups, diseño de BD | 01/08/2026 | 21/08/2026 |
| 2. Configuración de entorno | Setup de repositorio, backend base, frontend base, BD | 22/08/2026 | 05/09/2026 |
| 3. Módulo de autenticación | Registro, login, roles, JWT | 06/09/2026 | 13/09/2026 |
| 4. Módulo de reportes (ciudadano) | Creación de reporte, mapa, carga de evidencia | 14/09/2026 | 28/09/2026 |
| 5. Módulo de gestión (PNC / Municipalidad) | Panel de listado, detalle y cambio de estado | 29/09/2026 | 12/10/2026 |
| 6. Notificaciones e historial | Historial de estado, notificaciones in-app | 13/10/2026 | 19/10/2026 |
| 7. Pruebas e integración | Pruebas funcionales, corrección de errores | 20/10/2026 | 27/10/2026 |
| 8. Despliegue y presentación | Despliegue final, documentación, presentación | 28/10/2026 | 31/10/2026 |

---

## 8. Glosario de términos

| Término | Definición |
|---|---|
| PNC | Policía Nacional Civil de Guatemala |
| SPA | Single Page Application, aplicación de una sola página |
| JWT | JSON Web Token, estándar para tokens de autenticación |
| API REST | Interfaz de programación basada en el estilo arquitectónico REST |
| PostGIS | Extensión de PostgreSQL para el manejo de datos geoespaciales |
| Geolocalización | Determinación de la ubicación geográfica de un elemento |
