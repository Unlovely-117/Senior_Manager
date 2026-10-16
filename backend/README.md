# Backend Senior-Manager

## Version de Java

El backend usa Java 17 como version minima y objetivo de compilacion. `pom.xml` fija `maven.compiler.release=17`; Maven rechazara fuentes que dependan de APIs posteriores. El frontend no forma parte de esta compilacion Java.

Requisitos locales: JDK 17 y Maven 3.9 o posterior. Comprueba que `java` y `javac` apuntan al JDK 17, no a un runtime antiguo:

```powershell
java -version
javac -version
mvn -version
```

En Windows, si hay varias versiones instaladas, configura `JAVA_HOME` con la ruta del JDK 17 y antepon `$env:JAVA_HOME\bin` a `PATH` en la terminal actual antes de ejecutar Maven.

## Compilar y probar login

Desde esta carpeta:

```powershell
mvn clean test-compile
mvn test-compile exec:java "-Dexec.classpathScope=test" "-Dexec.mainClass=PruebaLogin"
```

`PruebaLogin` usa cuentas en memoria y una clave JWT de prueba; no requiere base de datos ni consulta archivos de usuarios. Las dependencias externas se resuelven desde Maven Central.

## Configuracion para ejecutar la API

La API requiere Java 17 o posterior y las variables PostgreSQL y JWT descritas en `docs/sprints/sprint-1/implementation-status.md`. No se incluyen claves ni credenciales por defecto. Inicia solo si PostgreSQL responde, las migraciones V1/V2/V3/V4/V5 estan aplicadas y existe el marcador del bootstrap de permisos; asi evita arrancar parcialmente conectado. Las migraciones se aplican con el comando explicito de Flyway descrito en `migrations/README.md`.

Con PostgreSQL, JWT, migraciones y bootstrap configurados, desde la raiz inicia el backend con:

```powershell
mvn -f backend/pom.xml exec:java
```

La verificacion de `GET /api/health` devuelve estado `ok` solo cuando la conexion, el esquema y los permisos estan listos; en caso contrario responde `503` con el paso pendiente.

## Inicializacion unica de permisos

La matriz aprobada para esta inicializacion esta en `config/permission-matrix-approved.csv`; su SHA-256 aprobado es `C6AF77260919E4E78568F306F95044B01B2355CCFC66D24AAEFE0CBC3AE210F8`. Antes de ejecutar, configura en la terminal local las variables PostgreSQL `SENIOR_MANAGE_JDBC_URL`, `SENIOR_MANAGE_DB_USERNAME`, `SENIOR_MANAGE_DB_PASSWORD`, el secreto aleatorio externo de al menos 32 bytes `SENIOR_MANAGE_PERMISSION_BOOTSTRAP_SECRET` y `SENIOR_MANAGE_PERMISSION_MATRIX_SHA256` con esa huella. No guardes esos valores en el repositorio ni los compartas por chat. Con el esquema aplicado, Java 17 y Maven disponibles, desde la raiz del proyecto ejecuta:

```powershell
mvn -f backend/pom.xml "-Dsenior.manage.mainClass=infrastructure.bootstrap.PermissionBootstrap" exec:java "-Dexec.args=backend/config/permission-matrix-approved.csv"
```

El CLI solicita el secreto y las credenciales actuales de una cuenta administradora activa mediante consola interactiva. La inicializacion normal solo funciona en una base sin permisos ni marcador previo; si ya hay configuracion, aborta sin sobrescribirla.

Si la matriz no existe o el backend ya fue inicializado pero una decision aprobada falta o esta desactualizada (por ejemplo `ADMINISTRADOR,USERS,CREATE`), ejecuta el modo recomendado. Inicializa una base vacia o reconcilia una matriz existente; aborta si el marcador y las decisiones estan inconsistentes:

```powershell
mvn -f backend/pom.xml "-Dsenior.manage.mainClass=infrastructure.bootstrap.PermissionBootstrap" "-Dexec.args=--apply-approved backend/config/permission-matrix-approved.csv" compile exec:java
```

Este modo requiere un secreto externo de al menos 32 bytes configurado en SENIOR_MANAGE_PERMISSION_BOOTSTRAP_SECRET y autentica interactivamente una cuenta administradora activa. Reemplaza las decisiones en una transaccion y actualiza el actor, la fecha y el SHA auditado. Usa la misma base PostgreSQL que la API. La API no ejecuta la reconciliacion automaticamente.

En Windows ejecuta `backend/scripts/repair-approved-permissions.ps1` desde cualquier directorio del proyecto. Solicita la URL JDBC, usuario y contrasena PostgreSQL de forma interactiva; genera un secreto temporal dentro del proceso, aplica migraciones y ejecuta `--apply-approved`. El CLI solicita las credenciales de una cuenta administradora activa. Usa la misma base que la API y no compartas credenciales por chat.

### Crear una cuenta administradora de recuperacion

Si no recuerdas la contrasena de ninguna cuenta administradora, ejecuta `backend/scripts/create-recovery-admin.ps1`. Solicita la conexion PostgreSQL y luego nombre, correo y una contrasena de al menos 12 caracteres con confirmacion. Inserta una cuenta activa con rol ADMINISTRADOR y almacena la contrasena con PBKDF2; no cambia las cuentas existentes. Despues ejecuta `backend/scripts/repair-approved-permissions.ps1` e inicia sesion en el CLI con esa cuenta. Ambas herramientas deben apuntar a la base que usa la API.


En desarrollo, Vite reenvia `/api` al backend local en `http://127.0.0.1:8080`, de modo que funciona aunque Vite elija un puerto distinto de 5173. En produccion, define `VITE_API_URL` con la URL publica de la API y configura el origen permitido del frontend en el servidor.

## OperaciÃ³n actual y persistencia (2026-10-16)

- La API se conecta Ãºnicamente a PostgreSQL usando `SENIOR_MANAGE_JDBC_URL`, `SENIOR_MANAGE_DB_USERNAME` y `SENIOR_MANAGE_DB_PASSWORD`. No hay una base de datos fÃ­sica dentro de este repositorio ni valores de conexiÃ³n predeterminados.
- Para localizar los archivos de datos del servidor ejecuta en PostgreSQL `SHOW data_directory;`. La base lÃ³gica, host y puerto se obtienen de la URL JDBC configurada para el proceso de la API.
- Java 17 y Maven son requisitos. Aplica V1â€“V5 y la matriz de permisos segÃºn las guÃ­as enlazadas arriba antes de arrancar el servidor.
- HistÃ³ricamente se almacenaron usuarios/profesionales en TXT. Esa persistencia fue migrada a PostgreSQL. Se retiraron los TXT de datos y sus repositorios; la herramienta puntual de importación ya se retiró tras completar la migración.
- El administrador puede editar la ficha completa. Si cambia el estado de verificaciÃ³n, usa las acciones de revisiÃ³n en el directorio; editar datos no concede verificaciÃ³n automÃ¡ticamente.
- Para desarrollo: `mvn -f backend/pom.xml exec:java`; en otra terminal `npm --prefix frontend run dev`. La configuraciÃ³n de PostgreSQL/JWT se debe exportar en cada terminal/proceso que la necesita y nunca escribirse en Git.

