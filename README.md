# Senior-Manage

Aplicación web para que administradores y profesionales coordinen atención, pacientes, asignaciones, citas, ejercicios y fichas profesionales.

## Inicio rápido

Requisitos: JDK 17, Maven 3.9+, Node.js/npm y PostgreSQL.

1. Configura PostgreSQL y las variables externas que describe [backend/README.md](backend/README.md). La URL JDBC indica el servidor y la base que usará la API.
2. Aplica las migraciones Flyway V1–V5 con el comando de [backend/migrations/README.md](backend/migrations/README.md).
3. Inicializa o reconcilia la matriz aprobada de permisos siguiendo [backend/README.md](backend/README.md).
4. En una terminal, desde la raíz: `mvn -f backend/pom.xml exec:java`.
5. En otra terminal: `npm --prefix frontend install` y `npm --prefix frontend run dev`.
6. Abre la dirección local que muestra Vite. `/api/health` informa si PostgreSQL, esquema y permisos están listos.

No hay credenciales, contraseñas ni secretos de ejemplo incluidos en el repositorio. Configúralos fuera del código.

## Datos y base de datos

El almacenamiento actual del servidor es PostgreSQL: cuentas, profesionales, permisos, pacientes, antecedentes, asignaciones, citas, ejercicios y sesiones se consultan desde allí. Los datos no viven en un archivo dentro del repositorio. La URL JDBC (`SENIOR_MANAGE_JDBC_URL`) determina el host, puerto y nombre de base; el directorio físico de PostgreSQL depende de la instalación del servidor. Consulta `SHOW data_directory;` en PostgreSQL para conocerlo.

En una etapa anterior se usaron archivos TXT como almacenamiento de usuarios y profesionales. La aplicación migró a PostgreSQL y dejó de leer/escribir esos archivos. Los TXT antiguos del proyecto y sus adaptadores se retiraron; la herramienta de importación se usó solo durante la migración y ya se retiró. No es necesario para el uso normal.

## Funciones

- Acceso por roles de administrador y profesional, con permisos validados en el backend.
- Administración de usuarios, profesionales y estado de cuentas.
- Fichas profesionales con datos de perfil enviados por el profesional y revisión del administrador.
- Pacientes, antecedentes y asignaciones con historial.
- Citas y seguimiento de ejercicios según los permisos vigentes.
- Tema claro/oscuro, seleccionable desde la pantalla y recordado en el navegador.

Los módulos sin flujo completo se identifican en la interfaz como en construcción.

## Documentación

- [Guía del proyecto y mapa de documentos](docs/README.md)
- [Arquitectura](docs/architecture/ARCHITECTURE.md)
- [API](docs/api/README.md)
- [Configuración y ejecución del backend](backend/README.md)
- [Migraciones de PostgreSQL](backend/migrations/README.md)
- [Documentación de sprints](docs/sprints/)

## Estructura

- `frontend/`: React, TypeScript, Vite e interfaz.
- `backend/src/`: API y lógica Java 17.
- `backend/migrations/`: migraciones Flyway versionadas.
- `database/`: notas de semillas, scripts y diagramas.
- `docs/`: arquitectura, API, requisitos y registro de sprints.

## Seguridad

No publiques la API de desarrollo en Internet. Para despliegues, configura HTTPS, secretos externos, copias de seguridad y controles de acceso adecuados. No registres ni compartas datos personales o clínicos.
