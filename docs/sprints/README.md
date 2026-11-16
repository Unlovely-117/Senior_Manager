# Seguimiento del Product Backlog y Sprints — Senior-Manage

**Fecha de actualización:** 2026-11-15  
**Corte implementado:** **Sprints 1, 2 y 3 completados en código** (además de contenerización y despliegue Docker/Caddy adelantados del Sprint 5).

---

## Resumen por Sprint

| Sprint | Enfoque principal | Historias | Estado actual en repositorio | Documentación |
| :--- | :--- | :--- | :--- | :--- |
| **Sprint 1** | Autenticación, Usuarios/Roles, Permisos y Seguridad | `PB-01`, `PB-02`, `PB-03`, `PB-04`, `PB-26` | **Completado** | [implementation-status.md](sprint-1/implementation-status.md) |
| **Sprint 2** | Pacientes, Antecedentes, Evolución y Dashboard Profesional | `PB-05`, `PB-06`, `PB-07`, `PB-08`, `PB-09`, `PB-25` | **Completado** | [sprint-2/README.md](sprint-2/README.md) |
| **Sprint 3** | Banco de Ejercicios, Categorías, Rutinas y Alertas Clínicas | `PB-10`–`PB-19` | **Completado** | [sprint-3/README.md](sprint-3/README.md) |
| **Sprint 4** | Sesiones Clínicas, Métricas y Cuidado Diario | `PB-20`–`PB-24`, `PB-31`–`PB-33` | **Parcial / Pendiente** (citas base adelantadas) | [sprint-4/README.md](sprint-4/README.md) |
| **Sprint 5** | Infraestructura Docker, Seguridad Avanzada, Reportes y RLS | `PB-27`–`PB-30`, `PB-34`–`PB-37` | **Parcial** (`PB-30` y `PB-37` adelantados) | — |

---

## Trazabilidad completa del Product Backlog

### Sprint 1 — Autenticación, Usuarios/Roles y Seguridad

| ID | Épica | Historia | Estado real en código | Evidencia principal |
| :--- | :--- | :--- | :--- | :--- |
| **PB-01** | Autenticación | Iniciar sesión de forma segura | **Implementado** | `POST /api/auth/login`, PBKDF2 210k, JWT HS256, rate limit `429`, [AppRouter.tsx](../../frontend/presentation/routes/AppRouter.tsx) |
| **PB-02** | Autenticación | Cerrar sesión y gestionar sesión activa | **Implementado** | `POST /api/auth/logout`, `GET /api/auth/me`, tabla `sesiones` |
| **PB-03** | Usuarios y Roles | Gestionar usuarios profesionales | **Implementado** | `/api/usuarios`, `/api/profesionales`, [UsersPage.tsx](../../frontend/presentation/pages/UsersPage.tsx), [ProfessionalsPage.tsx](../../frontend/presentation/pages/ProfessionalsPage.tsx) |
| **PB-04** | Usuarios y Roles | Asignar roles y configurar permisos | **Implementado** | `PATCH /api/usuarios/{email}/rol`, `PUT /api/permisos/...`, [AdminPermissionsPage.tsx](../../frontend/presentation/pages/AdminPermissionsPage.tsx) |
| **PB-26** | Seguridad | Controlar permisos e impedir acceso no autorizado | **Implementado** | [AuthorizationService.java](../../backend/src/application/usecases/AuthorizationService.java), ficha `VERIFICADA` y asignación activa |

### Sprint 2 — Pacientes y Dashboard

| ID | Épica | Historia | Estado real en código | Evidencia principal |
| :--- | :--- | :--- | :--- | :--- |
| **PB-05** | Pacientes | Registrar paciente | **Implementado** | `POST /api/pacientes`, validaciones QA y auto-asignación al profesional |
| **PB-06** | Pacientes | Consultar información del paciente | **Implementado** | `GET /api/pacientes`, `/historicos`, [ElderlyPage.tsx](../../frontend/presentation/pages/ElderlyPage.tsx) |
| **PB-07** | Pacientes | Actualizar información del paciente | **Implementado** | `PUT /api/pacientes/{id}`, `PUT /api/antecedentes/{id}` |
| **PB-08** | Pacientes | Consultar antecedentes al planificar ejercicios | **Implementado** | Panel de antecedentes en tiempo real dentro de [ExercisesPage.tsx](../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-09** | Pacientes | Visualizar historial para consultar evolución | **Implementado** | Sección *Historial y evolución del paciente* en [ElderlyPage.tsx](../../frontend/presentation/pages/ElderlyPage.tsx) |
| **PB-25** | Dashboard | Resumen de pacientes, sesiones y rutinas | **Implementado** | [ProfessionalDashboardPage.tsx](../../frontend/presentation/pages/ProfessionalDashboardPage.tsx) |

### Sprint 3 — Ejercicios, Rutinas y Prescripción

| ID | Épica | Historia | Estado real en código | Evidencia principal |
| :--- | :--- | :--- | :--- | :--- |
| **PB-10** | Ejercicios | Consultar banco de ejercicios | **Implementado** | `GET /api/ejercicios/catalogo` + 41 ejercicios semilla (`V6`) |
| **PB-11** | Ejercicios | Registrar nuevos ejercicios | **Implementado** | `POST /api/ejercicios/catalogo` |
| **PB-12** | Ejercicios | Modificar información de un ejercicio | **Implementado** | `PUT /api/ejercicios/catalogo/{id}` + formulario de edición en [ExercisesPage.tsx](../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-13** | Ejercicios | Organizar ejercicios por categorías | **Implementado** | Chips por categoría con conteo, búsqueda y filtro de categoría al prescribir |
| **PB-14** | Rutinas | Crear rutina personalizada para un paciente | **Implementado** | Agrupación de rutinas por paciente + `POST /api/ejercicios/planes` |
| **PB-15** | Rutinas | Agregar ejercicios a una rutina | **Implementado** | Adición continua de ejercicios por paciente y botón *+ Agregar ejercicio a su rutina* |
| **PB-16** | Rutinas | Configurar parámetros de cada ejercicio | **Implementado** | Frecuencia, series (1–20), repeticiones (1–200), duración (1–240 min) e indicaciones |
| **PB-17** | Rutinas | Modificar rutina existente según evolución | **Implementado** | `PUT /api/ejercicios/planes/{id}` (editar parámetros, finalizar o reactivar) |
| **PB-18** | Rutinas | Consultar rutinas actuales e históricas del paciente | **Implementado** | Campo `active` en `GET /api/ejercicios/planes` + filtros *Activas / Historial / Todas* |
| **PB-19** | Prescripción | Alerta ante contraindicación clínica del paciente | **Implementado** | `GET /api/ejercicios/catalogo/{patientId}`, bloqueo UI y rechazo `409` en backend |

### Sprints 4 y 5 — Siguientes entregas (referencia)

| ID | Sprint | Épica | Historia | Estado actual |
| :--- | :--- | :--- | :--- | :--- |
| **PB-20** | Sprint 4 | Sesiones | Programar sesión con un paciente | Base parcial (`/api/citas`, [AdminAppointmentsPage.tsx](../../frontend/presentation/pages/AdminAppointmentsPage.tsx)) |
| **PB-21** | Sprint 4 | Sesiones | Consultar sesiones programadas | Base parcial (`GET /api/citas` y dashboard) |
| **PB-22** | Sprint 4 | Sesiones | Registrar realización de una sesión | Pendiente (flujo clínico ligado a rutina) |
| **PB-23** | Sprint 4 | Seguimiento | Registrar métricas de una sesión | Pendiente |
| **PB-24** | Sprint 4 | Seguimiento | Consultar historial de sesiones | Pendiente |
| **PB-31** | Sprint 4 | Cuidado Diario | Registrar signos vitales | Pendiente |
| **PB-32** | Sprint 4 | Cuidado Diario | Registrar administración de medicamentos | Pendiente (solo tabla `V3` sin endpoints activos) |
| **PB-33** | Sprint 4 | Cuidado Diario | Registrar bitácora de turnos y cuidados | Pendiente |
| **PB-27** | Sprint 5 | Seguridad | Proteger información sensible | Parcial (TLS/Caddy, PBKDF2, JWT, aislamiento backend) |
| **PB-28** | Sprint 5 | Seguridad | Conservar trazabilidad histórica | Parcial (baja lógica en pacientes/asignaciones/rutinas) |
| **PB-29** | Sprint 5 | Infraestructura | Uso desde móvil/tablet en campo | Parcial (responsive Tailwind base) |
| **PB-30** | Sprint 5 | Infraestructura | Contenerizar la aplicación | **Adelantado** (`Dockerfile` multi-stage y `docker-compose.yml`) |
| **PB-34** | Sprint 5 | Reportes | Gráficas de evolución | Pendiente |
| **PB-35** | Sprint 5 | Reportes | Reportes PDF | Pendiente |
| **PB-36** | Sprint 5 | Auditoría | Auditar políticas RLS | Pendiente (aislamiento vigente en capa Java/SQL) |
| **PB-37** | Sprint 5 | Despliegue | Despliegue reproducible y seguro | **Adelantado** (`docker-compose.yml`, `Caddyfile`, `.env.example`, `ContainerBootstrap`) |
