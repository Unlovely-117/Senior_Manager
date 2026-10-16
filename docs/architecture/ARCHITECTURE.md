# Arquitectura de Senior-Manage

## Visión general

Senior-Manage es una aplicación cliente-servidor para la coordinación de atención a adultos mayores. Los clientes son el administrador y los profesionales. La interfaz no se conecta directamente a PostgreSQL.

```text
Navegador (React + TypeScript + Vite)
             │ HTTP / JSON bajo /api
             ▼
API Java 17 (HTTP, autorización, casos de uso)
             │ JDBC + migraciones Flyway
             ▼
PostgreSQL (datos persistentes)
```

## Componentes y responsabilidades

- **Frontend (`frontend/`)**: presenta las pantallas, administra la sesión visible y consume la API. No contiene credenciales de base de datos.
- **Presentación backend (`backend/src/presentation/`)**: rutas HTTP, validación de entrada, autenticación/autorización y respuestas JSON.
- **Aplicación (`backend/src/application/`)**: casos de uso y coordinación de operaciones.
- **Dominio (`backend/src/domain/`)**: entidades, contratos de repositorio y reglas independientes de HTTP/JDBC.
- **Infraestructura (`backend/src/infrastructure/`)**: PostgreSQL/JDBC, JWT, migraciones, bootstrap y adaptadores técnicos.
- **Migraciones (`backend/migrations/`)**: esquema versionado V1–V5. Flyway lo aplica de forma explícita; la API no cambia el esquema al arrancar.

Las dependencias de las capas externas apuntan hacia contratos y reglas internas. Los componentes visuales no ejecutan SQL y los casos de uso no dependen de React ni del protocolo HTTP.

## Persistencia

PostgreSQL es el único almacenamiento activo del backend para cuentas, fichas profesionales, sesiones, permisos, pacientes, antecedentes, asignaciones, citas y seguimiento de ejercicios. La conexión se obtiene de `SENIOR_MANAGE_JDBC_URL`, `SENIOR_MANAGE_DB_USERNAME` y `SENIOR_MANAGE_DB_PASSWORD`. No se incluyen credenciales en el repositorio.

En una etapa temprana, usuarios y profesionales se guardaban en TXT. El sistema migró a PostgreSQL; los archivos de datos y sus repositorios TXT fueron retirados. La herramienta puntual de importación se retiró después de completar la migración. Los archivos físicos de PostgreSQL están en el servidor y su ubicación se consulta con `SHOW data_directory;`.

## Identidad y autorización

La API valida la sesión y el permiso de módulo/acción. El rol en sí no concede acceso implícito a cada endpoint: los permisos efectivos se administran en PostgreSQL mediante la matriz aprobada. El acceso profesional a pacientes, antecedentes, citas y ejercicios se limita por asignación activa en el servidor.

Los profesionales completan su ficha; el envío la marca pendiente. Un administrador puede corregir o completar los mismos datos y debe usar la acción de revisión para verificarla o solicitar cambios.

## Ejecución local

Requisitos: JDK 17, Maven, Node.js/npm y PostgreSQL. Los comandos de migración, inicialización de permisos y ejecución se encuentran en `backend/README.md`. En desarrollo, Vite envía `/api` a `http://127.0.0.1:8080`.

El selector de tema claro/oscuro está en la cabecera de la interfaz. La selección se guarda en el almacenamiento local del navegador y no modifica datos de la cuenta.
