# Backend Senior-Manager

## Versión de Java

El backend usa **Java 17** como versión mínima y objetivo de compilación (`maven.compiler.release=17` en `backend/pom.xml`).

Requisitos locales: JDK 17 y Maven 3.9 o posterior. Comprueba las versiones activas antes de compilar:

```bash
java -version
javac -version
mvn -version
```

En Windows, si hay varias versiones instaladas, configura `JAVA_HOME` apuntando al JDK 17 y antepón `$env:JAVA_HOME\bin` a `PATH` en la terminal actual.

---

## Compilar y ejecutar pruebas unitarias

Desde la raíz del repositorio (o dentro de `backend/` ajustando `-f`):

```bash
mvn -f backend/pom.xml clean test-compile
mvn -f backend/pom.xml exec:java -Dexec.classpathScope=test -Dsenior.manage.mainClass=PruebaLogin
```

`PruebaLogin` ejecuta 14 verificaciones aisladas en memoria (credenciales válidas/inválidas, cuenta inactiva, normalización de correo, contraseña temporal, claims JWT, firma alterada, audiencia y expiración) sin requerir PostgreSQL.

---

## Configuración y ejecución de la API

### Variables de entorno requeridas

| Variable | Uso |
| :--- | :--- |
| `SENIOR_MANAGE_JDBC_URL` | Cadena JDBC de PostgreSQL (ej. `jdbc:postgresql://127.0.0.1:5432/senior_manage`) |
| `SENIOR_MANAGE_DB_USERNAME` | Usuario de conexión a PostgreSQL |
| `SENIOR_MANAGE_DB_PASSWORD` | Contraseña de PostgreSQL |
| `SENIOR_MANAGE_JWT_SECRET` | Secreto HS256 de al menos 32 bytes para firmar tokens |
| `SENIOR_MANAGE_JWT_KEY_ID` | Identificador de clave JWT activa (`kid`) |
| `SENIOR_MANAGE_JWT_ISSUER` | Emisor esperado del JWT |
| `SENIOR_MANAGE_JWT_AUDIENCE` | Audiencia esperada del JWT |
| `SENIOR_MANAGE_FRONTEND_ORIGIN` | Origen(es) permitidos por CORS (separados por coma) |
| `PORT` / `SENIOR_MANAGE_PORT` | Puerto HTTP de escucha (por defecto `8080`) |
| `SENIOR_MANAGE_BIND_ADDRESS` | IP de escucha (`127.0.0.1` en local; `0.0.0.0` en contenedor) |

> Variables opcionales para rotación de JWT: `SENIOR_MANAGE_JWT_PREVIOUS_SECRET`, `SENIOR_MANAGE_JWT_PREVIOUS_KEY_ID` y `SENIOR_MANAGE_JWT_LIFETIME_SECONDS` (por defecto `900` s = 15 min).

La API inicia únicamente si PostgreSQL responde, las migraciones **V1–V6** figuran aplicadas en `flyway_schema_history` y la tabla `permisos_rol` tiene el marcador de bootstrap (`permission_bootstrap_state`). Puedes consultar el estado en `GET /api/health` (`200 ok` o `503` con el paso pendiente).

### Ejecución local manual

```bash
mvn -f backend/pom.xml exec:java
```

En desarrollo, Vite reenvía `/api` al backend local en `http://127.0.0.1:8080`.

### Arranque automático en contenedores (`ContainerBootstrap`)

Cuando se ejecuta mediante Docker (`Dockerfile` / `backend/Dockerfile`), la clase `infrastructure.bootstrap.ContainerBootstrap` realiza automáticamente antes de levantar `SeniorManageApiServer`:
1. Espera a que PostgreSQL responda.
2. Ejecuta las migraciones Flyway `V1–V6`.
3. Crea la cuenta administradora inicial si se configuraron `SENIOR_MANAGE_INITIAL_ADMIN_EMAIL` y `SENIOR_MANAGE_INITIAL_ADMIN_PASSWORD` (12–128 caracteres).
4. Verifica el SHA-256 de `backend/config/permission-matrix-approved.csv` y aplica/reconcilia la matriz aprobada de permisos en PostgreSQL.

---

## Inicialización y reconciliación de permisos

La matriz oficial aprobada se encuentra en [config/permission-matrix-approved.csv](config/permission-matrix-approved.csv) y define:
- **26 permisos permanentes** para `ADMINISTRADOR` (control total de usuarios, profesionales, asignaciones, permisos, pacientes, antecedentes, citas y ejercicios).
- **12 permisos clínicos configurables** para `PROFESIONAL` (`PACIENTES`, `ANTECEDENTES`, `CITAS` y `EJERCICIOS`), todos acotados por asignación activa y verificación de ficha.

Su huella SHA-256 aprobada vigente es:

```text
17FCA67F245F12A08A8EA7B05CF5ACB8E2EE24CB1B50EF636735DB222FFE11B4
```

Para inicializar o reconciliar la matriz manualmente fuera de Docker, define en tu terminal las variables JDBC, un secreto aleatorio externo (`SENIOR_MANAGE_PERMISSION_BOOTSTRAP_SECRET` ≥ 32 bytes) y `SENIOR_MANAGE_PERMISSION_MATRIX_SHA256` con la huella anterior, y ejecuta:

```bash
# Base nueva sin permisos:
mvn -f backend/pom.xml -Dsenior.manage.mainClass=infrastructure.bootstrap.PermissionBootstrap exec:java -Dexec.args=backend/config/permission-matrix-approved.csv

# Reconciliar una matriz ya existente al esquema/permisos actuales:
mvn -f backend/pom.xml -Dsenior.manage.mainClass=infrastructure.bootstrap.PermissionBootstrap -Dexec.args="--apply-approved backend/config/permission-matrix-approved.csv" compile exec:java
```

En Windows también están disponibles los asistentes en `backend/scripts/`:
- [scripts/repair-approved-permissions.ps1](scripts/repair-approved-permissions.ps1): aplica migraciones y reconcilia la matriz aprobada de forma interactiva.
- [scripts/create-recovery-admin.ps1](scripts/create-recovery-admin.ps1): crea una cuenta administradora de recuperación en PostgreSQL con contraseña PBKDF2 de mínimo 12 caracteres.

---

## Persistencia e historial

- PostgreSQL es el único almacenamiento activo mediante JDBC y `PreparedStatement`.
- El almacenamiento temprano en archivos TXT (`backend/data/`) y las utilidades de migración/importación de texto fueron retirados del proyecto.
- Para localizar los archivos físicos del servidor PostgreSQL consulta `SHOW data_directory;` directamente en tu instancia.
