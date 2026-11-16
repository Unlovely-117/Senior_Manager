# Arquitectura de Senior-Manage

## 1. Visión general

Senior-Manage implementa una arquitectura **cliente-servidor por capas**, separando responsabilidades de dominio, casos de uso, infraestructura y presentación tanto en el backend Java 17 como en el frontend React + TypeScript.

```text
Navegador (React 18 + TypeScript + Vite / Nginx)
              │ HTTPS / Reverse Proxy (Caddy) -> /api
              ▼
API Java 17 (HttpServer, JWT, Autorización, Casos de uso)
              │ JDBC + Migraciones Flyway (V1–V6)
              ▼
PostgreSQL 16 (Persistencia relacional)
```

---

## 2. Capas del sistema

### Frontend (`frontend/`)
- **`domain/models/`:** modelos e interfaces TypeScript (`management.ts`).
- **`infrastructure/`:** cliente HTTP (`managementApi.ts`) sobre `fetch`, gestión de token JWT en `sessionStorage` y detección global de expiración (`401`).
- **`application/`:** fachada de servicios de aplicación (`managementService.ts`) consumida por las páginas.
- **`presentation/`:** enrutamiento por sesión/rol (`AppRouter.tsx`), componentes reutilizables (`BrandMark.tsx`) y vistas operativas por rol (`AdminDashboardPage`, `ProfessionalDashboardPage`, `UsersPage`, `ProfessionalsPage`, `ProfessionalProfilePage`, `ElderlyPage`, `AdminAssignmentsPage`, `AdminPermissionsPage`, `AdminAppointmentsPage`, `ExercisesPage`, `ChangePasswordPage`).

### Backend (`backend/src/`)
- **`domain/`:** entidades (`Usuario`, `Profesional`, `Paciente`, `Antecedente`, `AsignacionProfesionalPaciente`, `Permiso`, `Rol`, etc.) y puertos de repositorio independientes de JDBC/HTTP.
- **`application/usecases/`:** reglas de negocio y casos de uso (`LoginService`, `AuthorizationService`, `GestionarUsuarios`, `GestionarUsuariosProfesionales`, `GestionarPermisos`, `GestionarPacientes`, `GestionarAntecedentes`, `GestionarAsignaciones`).
- **`infrastructure/`:** repositorios JDBC sobre PostgreSQL (`PostgresRepositorio*`), configuración de base de datos y JWT (`EnvironmentDatabaseConfiguration`, `EnvironmentJwtConfiguration`, `JwtTokenService`), migrador (`ApplyMigrations`) y bootstrap (`PermissionBootstrap`, `ContainerBootstrap`).
- **`presentation/`:** servidor HTTP embebido (`SeniorManageApiServer.java`), parseo/validación de entrada (`readForm`), cabeceras de seguridad, CORS y serialización JSON.
- **`shared/security/`:** `PasswordHasher` con `PBKDF2WithHmacSHA256` (`210 000` iteraciones, tope de `128` caracteres, soporte de hashes temporales `TEMPORARY$`).

---

## 3. Modelo de datos PostgreSQL (`V1–V6`)

| Migración | Tablas / Cambios clave |
| :--- | :--- |
| **V1** | `pacientes`, `antecedentes`, `permisos_rol`, `sesiones`, `permission_bootstrap_state`, `asignaciones_profesional_paciente`. |
| **V2** | `usuarios`, `profesionales` (vínculo `usuario_id`), FK `asignaciones_profesional_paciente.profesional_id`, `legacy_text_import`. |
| **V3** | `citas`, `seguimientos_medicamentos`. |
| **V4** | `seguimientos_ejercicios`. |
| **V5** | Columnas de credencial y flujo de verificación administrativa en `profesionales` (`estado_verificacion`, `nota_revision`, `verificado_por`, `verificado_en`). |
| **V6** | `catalogo_ejercicios` (con `restricciones_clinicas TEXT[]` y 41 ejercicios semilla), `planes_ejercicios` (`frecuencia`, `series`, `repeticiones`, `duracion_minutos`, `indicaciones`, `activo`) y columna opcional `ejercicio_catalogo_id` en `seguimientos_ejercicios`. |

---

## 4. Seguridad, identidad y autorización

1. **Autenticación y mitigación de abuso:** `/api/auth/login` valida credenciales con hash constante incluso para correos inexistentes/inactivos (`DUMMY_HASH`), limita a 8 intentos fallidos cada 300 segundos (HTTP `429`) y exige cambio inmediato si el hash es temporal (`TEMPORARY$`).
2. **Sesiones revocables:** Cada JWT HS256 (15 minutos) incluye un `jti` persistido en la tabla `sesiones` y verificado en cada petición protegida (`requireSession`).
3. **Política `default-deny`:** `AuthorizationService` deniega toda acción no autorizada explícitamente. El `ADMINISTRADOR` mantiene sus 26 permisos fijos y el `PROFESIONAL` depende de los 12 permisos clínicos configurables en `permisos_rol`.
4. **Aislamiento clínico:** Las cuentas con rol `PROFESIONAL` solo acceden a pacientes, antecedentes, citas, alertas del catálogo y rutinas cuando su ficha está `VERIFICADA` y existe una asignación vigente (`ACTIVA`, `fecha_fin IS NULL`) con el paciente.
5. **Integridad de despliegue:** `ContainerBootstrap` y `PermissionBootstrap` validan el SHA-256 de `backend/config/permission-matrix-approved.csv` (`17FCA67F245F12A08A8EA7B05CF5ACB8E2EE24CB1B50EF636735DB222FFE11B4`) antes de inicializar o reconciliar permisos.

---

## 5. Arquitectura de despliegue (Docker Compose + Caddy)

Definida en [docker-compose.yml](../../docker-compose.yml):
- **`caddy` (`caddy:2-alpine`):** termina HTTP/HTTPS (`HTTP_PORT` / `HTTPS_PORT`) usando [Caddyfile](../../Caddyfile) con compresión `gzip`/`zstd` y reenvío a `frontend:80`.
- **`frontend` (Nginx):** sirve los estáticos compilados de Vite y hace proxy de `/api` hacia `http://backend:8080`.
- **`backend` (Temurin JRE 17):** usuario no privilegiado `appuser`; ejecuta `ContainerBootstrap` (espera DB → aplica Flyway `V1–V6` → asegura admin inicial → reconcilia matriz aprobada) e inicia `SeniorManageApiServer`.
- **`db` (`postgres:16-alpine`):** volumen persistente `postgres_data` accesible únicamente en la red interna de Docker.
