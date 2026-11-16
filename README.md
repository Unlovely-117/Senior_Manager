# Senior-Manage

Aplicación web clínica y administrativa para la gestión integral de adultos mayores, profesionales tratantes, asignaciones, citas médicas, catálogo y rutinas de ejercicios personalizadas.

---

## Estado del proyecto

- **Sprints completados hasta el corte actual:** **Sprint 1**, **Sprint 2** y **Sprint 3** (`PB-01` a `PB-19`, `PB-25`, `PB-26`), además de la base de contenerización y despliegue reproducible (`PB-30`, `PB-37`).
- Consulta el detalle completo por historia en [docs/sprints/README.md](docs/sprints/README.md).

### Funciones principales implementadas

- **Autenticación y sesión segura (`PB-01`, `PB-02`):** inicio de sesión por correo y contraseña (`PBKDF2WithHmacSHA256` a 210 000 iteraciones), emisión de JWT HS256 de vida corta, limitación de intentos fallidos (`429`), cambio obligatorio de contraseña temporal y revocación de sesiones en PostgreSQL.
- **Usuarios, roles y permisos (`PB-03`, `PB-04`, `PB-26`):** administración de cuentas (`ADMINISTRADOR` y `PROFESIONAL`), matriz de permisos aprobada (`26` permisos totales permanentes para administrador y `12` permisos clínicos configurables para profesional) y aislamiento de datos en servidor por asignación activa.
- **Directorio y fichas profesionales:** alta/edición de credenciales (especialidad, registro profesional, formación, experiencia y presentación) con flujo de envío a revisión y verificación administrativa (`SIN_PRESENTAR`, `PENDIENTE`, `VERIFICADA`, `REQUIERE_CAMBIOS`).
- **Adultos mayores, antecedentes e historial clínico (`PB-05`–`PB-09`):** registro y actualización con validaciones (nombre 3–120 caracteres, documento 6–10 dígitos, edad 60–120 años no futura, teléfono 7–10 dígitos), auto-asignación al profesional creador, consulta histórica de inactivos, antecedentes clínicos e historial integral de evolución del paciente (rutinas, citas y seguimientos).
- **Dashboard administrativo y profesional (`PB-25`):** resumen con métricas en tiempo real de pacientes asignados, sesiones/citas programadas y ejercicios en rutinas activas.
- **Banco de ejercicios, rutinas y alertas clínicas (`PB-10`–`PB-19`):** catálogo con 41 ejercicios semilla en 7 categorías (`Movilidad`, `Fuerza`, `Equilibrio`, `Resistencia`, `Flexibilidad`, `Respiración`, `Coordinación`), creación y edición de ejercicios, búsqueda y filtrado por categoría, cruce automático de contraindicaciones contra antecedentes del paciente, consulta de antecedentes al prescribir y gestión de rutinas personalizadas (crear, agregar ejercicios, configurar frecuencia/series/repeticiones/duración/indicaciones, modificar y consultar planes activos e históricos).
- **Citas médicas:** programación, listado, completado y cancelación sobre pacientes con asignación activa.
- **Interfaz adaptable:** tema claro/oscuro seleccionable en pantalla y persistido localmente en el navegador.

---

## Inicio rápido

### Opción 1: Despliegue contenerizado con Docker Compose (recomendado / VPS)

La raíz incluye [docker-compose.yml](docker-compose.yml), [Caddyfile](Caddyfile) y [.env.example](.env.example) para levantar PostgreSQL 16, el backend Java 17 (con ejecución automática de Flyway V1–V6, creación del administrador inicial y reconciliación de permisos mediante `ContainerBootstrap`), el frontend Nginx y el proxy inverso Caddy:

1. Copia `.env.example` a `.env` y define contraseñas y secretos seguros (`POSTGRES_PASSWORD`, `SENIOR_MANAGE_JWT_SECRET`, credenciales de administrador inicial y dominio/CORS).
2. Ejecuta:
   ```bash
   docker compose up -d --build
   ```
3. Verifica la salud en `/api/health`.

### Opción 2: Ejecución local en desarrollo

Requisitos: **JDK 17**, **Maven 3.9+**, **Node.js/npm** y **PostgreSQL**.

1. Configura PostgreSQL y las variables externas descritas en [backend/README.md](backend/README.md).
2. Aplica las migraciones Flyway `V1–V6` siguiendo [backend/migrations/README.md](backend/migrations/README.md).
3. Inicializa o reconcilia la matriz aprobada de permisos siguiendo [backend/README.md](backend/README.md).
4. En una terminal, desde la raíz:
   ```bash
   mvn -f backend/pom.xml exec:java
   ```
5. En otra terminal:
   ```bash
   npm --prefix frontend install
   npm --prefix frontend run dev
   ```
6. Abre la URL local que muestra Vite (`/api` se reenvía al backend en `http://127.0.0.1:8080`).

> No hay credenciales, contraseñas ni secretos reales incluidos en el repositorio. Configúralos siempre en variables externas o en `.env` (ignorado por Git).

---

## Datos y base de datos

El almacenamiento activo del sistema es **PostgreSQL**: usuarios, profesionales, sesiones, permisos, pacientes, antecedentes, asignaciones, citas, catálogo de ejercicios, planes/rutinas y seguimientos se consultan desde allí. La URL JDBC (`SENIOR_MANAGE_JDBC_URL`) define el host, puerto y base lógica.

> En una etapa inicial del Sprint 1 existieron archivos TXT locales para usuarios y profesionales. Esa persistencia fue reemplazada por PostgreSQL; tanto los TXT como sus adaptadores y herramienta de importación fueron retirados del repositorio.

---

## Documentación

- [Guía general y mapa de documentos](docs/README.md)
- [Estado del Product Backlog y Sprints 1–4](docs/sprints/README.md)
- [Arquitectura del sistema](docs/architecture/ARCHITECTURE.md)
- [Especificación de API HTTP](docs/api/README.md)
- [Requisitos funcionales y no funcionales](docs/requirements/README.md)
- [Configuración, bootstrap y ejecución del backend](backend/README.md)
- [Migraciones de PostgreSQL (V1–V6)](backend/migrations/README.md)
- [Auditoría de seguridad y despliegue](docs/REVISION_SEGURIDAD_Y_DESPLIEGUE_VERCEL.md)
- [Guía de Git y flujo del equipo](docs/CONTRIBUTING.md)

---

## Estructura del repositorio

- `frontend/`: aplicación React 18 + TypeScript + Vite + Tailwind CSS (capas `domain`, `application`, `infrastructure`, `presentation`).
- `backend/src/`: API HTTP y lógica Java 17 (`domain`, `application`, `infrastructure`, `presentation`, `shared`).
- `backend/migrations/`: migraciones Flyway versionadas (`V1` a `V6`).
- `backend/config/`: matriz oficial de permisos aprobada (`permission-matrix-approved.csv`).
- `database/`: notas de semillas, scripts y diagramas.
- `docs/`: documentación técnica, API, requisitos y seguimiento de sprints.

---

## Seguridad

- No expongas la API de desarrollo directamente sin proxy HTTPS. Para producción usa el stack con Caddy (`Caddyfile`), secretos externos de al menos 32 bytes y copias de seguridad de PostgreSQL.
- Nunca subas archivos `.env`, tokens ni datos personales o clínicos reales al repositorio.
