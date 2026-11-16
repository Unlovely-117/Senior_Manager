# Requisitos Funcionales y No Funcionales

Alcance consolidado e implementado hasta el **Sprint 3** según el código vigente y el Product Backlog oficial ([docs/sprints/README.md](../sprints/README.md)).

---

## 1. Actores del sistema

- **Administrador:** controla usuarios y roles, directorio y verificación de fichas profesionales, asignaciones profesional-paciente, matriz de permisos configurable para profesionales, pacientes, antecedentes, citas y módulo de ejercicios/rutinas.
- **Profesional:** autentica su sesión, diligencia y envía su ficha profesional a verificación, y atiende a sus pacientes asignados activos (gestión de pacientes, antecedentes, citas, catálogo de ejercicios, alertas y rutinas) conforme a los permisos vigentes otorgados por el administrador.
- **Paciente (Adulto mayor):** entidad clínica administrada en el sistema; no cuenta con acceso de inicio de sesión.

---

## 2. Requisitos funcionales implementados (Sprints 1–3)

### Sprint 1 — Autenticación, Usuarios, Roles y Seguridad
1. **Inicio y cierre de sesión seguro (`PB-01`, `PB-02`):** autenticar cuentas activas mediante credenciales verificadas con PBKDF2, emitir JWT de corta duración con `jti` revocable en servidor, exigir cambio obligatorio de contraseña temporal y limitar intentos fallidos (`HTTP 429`).
2. **Gestión de usuarios y profesionales (`PB-03`):** crear, editar, activar/desactivar y eliminar cuentas; gestionar fichas profesionales con documento, contacto, especialidad, tarjeta/registro profesional, formación, experiencia y presentación, con flujo separado de revisión administrativa (`VERIFICADA` / `REQUIERE_CAMBIOS`).
3. **Control de roles y permisos (`PB-04`, `PB-26`):** aplicar matriz de permisos `default-deny` en servidor (`26` permisos fijos para `ADMINISTRADOR`; `12` permisos clínicos configurables para `PROFESIONAL`) y restringir los datos clínicos del profesional únicamente a sus pacientes con asignación activa.

### Sprint 2 — Pacientes, Evolución y Dashboard
4. **Registro, consulta y actualización de pacientes (`PB-05`, `PB-06`, `PB-07`):** validar nombre (3–120 caracteres), cédula numérica única (6–10 dígitos), fecha de nacimiento (adulto mayor de 60–120 años, no futura) y teléfono (7–10 dígitos); auto-asignar al profesional cuando crea un paciente; permitir desactivación lógica conservando historial en modo solo lectura (`historicos`).
5. **Antecedentes e historial clínico de evolución (`PB-08`, `PB-09`):** registrar y actualizar antecedentes clínicos asociados al paciente, mostrar dichos antecedentes al planificar ejercicios y visualizar en la ficha del paciente su historial de evolución (antecedentes, rutinas activas e históricas, citas y seguimientos).
6. **Resumen en panel de trabajo (`PB-25`):** ofrecer al profesional un panel principal con métricas y acceso rápido a sus pacientes asignados, sesiones/citas programadas y rutinas activas.

### Sprint 3 — Ejercicios, Rutinas y Prescripción Segura
7. **Banco de ejercicios y mantenimiento (`PB-10`, `PB-11`, `PB-12`):** consultar el catálogo base y permitir a usuarios autorizados (`EJERCICIOS/CREATE`) registrar nuevos ejercicios o modificar ejercicios existentes (nombre, categoría, descripción y contraindicaciones).
8. **Organización por categorías (`PB-13`):** organizar y filtrar el banco de ejercicios por categorías con conteo y búsqueda por texto tanto en el catálogo como al construir rutinas.
9. **Rutinas personalizadas y ajuste evolutivo (`PB-14`–`PB-18`):** crear y agrupar rutinas por paciente, agregar múltiples ejercicios, configurar frecuencia, series, repeticiones, duración e indicaciones, modificar parámetros de ejercicios ya prescritos, pasar ejercicios a historial o reactivarlos y consultar planificaciones actuales e históricas por paciente.
10. **Alertas de contraindicación clínica (`PB-19`):** cruzar automáticamente `restricciones_clinicas` del catálogo contra los `antecedentes` del paciente seleccionado, bloqueando en interfaz y servidor (`HTTP 409`) la prescripción o reactivación de ejercicios contraindicados.

---

## 3. Requisitos no funcionales

- **Stack tecnológico:** Java 17 + JDBC + Flyway (`V1–V6`) en backend; React 18 + TypeScript + Vite + Tailwind CSS en frontend; PostgreSQL 16 como persistencia única.
- **Seguridad:** secretos exclusivamente en configuración externa (`.env` / variables de entorno); hashes `PBKDF2WithHmacSHA256` (210 000 iteraciones); consultas SQL parametrizadas con `PreparedStatement`; cabeceras de endurecimiento HTTP y CORS restringido por origen.
- **Usabilidad y adaptabilidad:** interfaz responsiva para escritorio, tablet y móvil; navegación por teclado accesible y soporte persistente de tema claro/oscuro.
- **Reproducibilidad de despliegue:** empaquetado Docker multi-stage (`frontend/Dockerfile`, `backend/Dockerfile`, `Dockerfile`), orquestación en `docker-compose.yml` con proxy `Caddy` y auto-bootstrap verificado por SHA-256.
