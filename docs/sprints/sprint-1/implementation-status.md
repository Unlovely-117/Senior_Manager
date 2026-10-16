# Estado de implementación

Actualizado: 2026-10-16. Esta página resume el estado del código; la disponibilidad real depende de las variables configuradas en el equipo que ejecuta el servidor.

## Arquitectura y datos

- El frontend React/TypeScript consume la API Java 17 mediante `/api`.
- PostgreSQL es la persistencia activa para usuarios, profesionales, sesiones, permisos, pacientes, antecedentes, asignaciones, citas y ejercicios.
- El proyecto usó inicialmente TXT para usuarios y profesionales; esos datos se migraron a PostgreSQL y se retiraron los archivos/adaptadores locales de TXT.
- La importación inicial ya se completó y su herramienta puntual se retiró.
- La base no se encuentra dentro del repositorio. `SENIOR_MANAGE_JDBC_URL` determina host, puerto y nombre de base. `SHOW data_directory;` consulta el directorio físico desde PostgreSQL.

## Funciones de interfaz conectadas

- Administración de cuentas, roles y estado activo/inactivo.
- Fichas profesionales: profesional completa y envía; administrador puede ver y editar los mismos campos, y aprobar o solicitar correcciones por separado.
- Pacientes, antecedentes y asignaciones con historial.
- Citas y seguimiento de ejercicios según permisos.
- Tema claro/oscuro con preferencia local al navegador.
- Asignaciones muestra resúmenes de estado, filtros, responsable e historial.

## Preparación y ejecución

1. Instala JDK 17, Maven, Node.js/npm y PostgreSQL.
2. Configura en el proceso del backend `SENIOR_MANAGE_JDBC_URL`, `SENIOR_MANAGE_DB_USERNAME`, `SENIOR_MANAGE_DB_PASSWORD` y las variables JWT requeridas.
3. Aplica V1–V5 según `backend/migrations/README.md`.
4. Aplica/inicializa la matriz aprobada según `backend/README.md`.
5. Inicia el backend y frontend con los comandos del README principal. Confirma estado con `/api/health`.

No se pudo compilar el backend en la última revisión de este entorno porque Maven no está instalado/disponible en PATH. `npm run typecheck` sí pasó; `npm run build` llegó a Vite y falló porque el sandbox denegó acceso a un directorio padre. No se ejecutaron pruebas ni se conectó a PostgreSQL en esta revisión.

## Documentos relacionados

- Guía de arranque: `README.md`
- Configuración backend: `backend/README.md`
- API: `docs/api/README.md`
- Arquitectura: `docs/architecture/ARCHITECTURE.md`
- Requisitos: `docs/requirements/README.md`
- Migraciones: `backend/migrations/README.md`
- Sprints anteriores: `docs/sprints/`; sus revisiones reflejan el estado de la fecha indicada.

