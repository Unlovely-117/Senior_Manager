# Senior-Manage API

Referencia técnica de la API HTTP implementada en [SeniorManageApiServer.java](../../backend/src/presentation/SeniorManageApiServer.java) bajo el prefijo `/api`.

---

## 1. Convenciones generales

- **Transporte y formato de petición:** `application/x-www-form-urlencoded;charset=UTF-8` (límite de payload `16 384` bytes).
- **Respuestas:** JSON UTF-8 (`Content-Type: application/json; charset=utf-8`), acompañadas de `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: strict-origin-when-cross-origin`.
- **Autenticación:** cabecera `Authorization: Bearer <jwt>` (token HS256 con expiración de 15 minutos y registro/revocación por `jti` en la tabla `sesiones`).
- **Control de acceso (RBAC + aislamiento):**
  - La autorización se evalúa en [AuthorizationService.java](../../backend/src/application/usecases/AuthorizationService.java) contra la tabla `permisos_rol` (`default-deny`).
  - `ADMINISTRADOR` dispone de los **26 permisos** del sistema de forma permanente.
  - `PROFESIONAL` tiene **12 permisos clínicos configurables** y requiere además que su ficha profesional esté en estado `VERIFICADA` y que el paciente cuente con asignación activa (`ACTIVA`, `fecha_fin IS NULL`) para consultar o modificar su información clínica.
- **Códigos HTTP principales:** `200` OK, `201` Creado, `204` Preflight CORS, `400` Datos inválidos, `401` No autenticado / token revocado o expirado, `403` Permiso denegado / cambio de contraseña pendiente / ficha no verificada / paciente no asignado, `404` Recurso no encontrado, `405` Método no permitido, `409` Conflicto de estado o alerta clínica, `429` Rate limit de login excedido, `503` Base de datos o configuración no disponible.

---

## 2. Salud y Autenticación (`PB-01`, `PB-02`)

| Método | Ruta | Autenticación / Rol | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Pública | Verifica conexión JDBC, migraciones Flyway `V1–V6` y bootstrap de permisos (`200` o `503`). |
| `POST` | `/api/auth/login` | Pública | Autentica `email` y `password` (PBKDF2 210k). Bloquea temporalmente con HTTP `429` tras 8 intentos fallidos en 5 minutos. |
| `GET` | `/api/auth/me` | Autenticado | Devuelve `{email, name, role, mustChangePassword}` de la sesión vigente. |
| `POST` | `/api/auth/change-password` | Autenticado | Actualiza contraseña (`password`, `confirmation` de 8–128 chars) y revoca las demás sesiones del usuario. |
| `POST` | `/api/auth/logout` | Autenticado | Revoca el `jti` de la sesión actual en PostgreSQL. |

---

## 3. Usuarios, Roles y Permisos (`PB-03`, `PB-04`, `PB-26`)

### Gestión de usuarios (`/api/usuarios`, solo `ADMINISTRADOR`)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/usuarios` | Lista todas las cuentas registradas. |
| `POST` | `/api/usuarios` | Crea usuario (`name`, `email`, `password` 8–128 chars, `role`: `admin` \| `professional`). |
| `GET` | `/api/usuarios/{email}` | Consulta una cuenta por correo normalizado. |
| `PUT` | `/api/usuarios/{email}` | Actualiza `name` y `email` (sincroniza ficha vinculada si aplica). |
| `PUT` | `/api/usuarios/{email}/password` | Restablece contraseña de otra cuenta e invalida sus sesiones activas. |
| `PATCH` | `/api/usuarios/{email}/rol` | Cambia rol (`admin` \| `professional`), protegiendo que exista al menos un administrador activo. |
| `PATCH` | `/api/usuarios/{email}/estado` | Activa o desactiva cuenta (`active`: `true` \| `false`), revocando sesiones al desactivar. |
| `DELETE` | `/api/usuarios/{email}` | Elimina cuenta (y ficha profesional vinculada si es profesional). |

### Permisos (`/api/permisos`)

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/permisos/mis-permisos` | Autenticado | Retorna la matriz efectiva de permisos para el rol del usuario actual. |
| `GET` | `/api/permisos/{role}` | `ADMINISTRADOR` | Lista permisos configurados (`admin` o `professional`). |
| `PUT` | `/api/permisos/professional/{module}/{operation}` | `ADMINISTRADOR` | Habilita o deshabilita (`allowed`: `true` \| `false`) uno de los 12 permisos clínicos configurables del profesional. |

---

## 4. Profesionales y Ficha Profesional (`PB-03`)

### Autogestión profesional

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/mi-perfil-profesional` | `PROFESIONAL` | Obtiene la ficha vinculada al usuario actual y su `verificationStatus`. |
| `PUT` | `/api/mi-perfil-profesional` | `PROFESIONAL` | Envía o actualiza `document`, `phone`, `specialty`, `licenseNumber`, `education`, `experience`, `biography` y deja la ficha en estado `PENDIENTE`. |

### Directorio y verificación (solo `ADMINISTRADOR`)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/profesionales` | Lista cuentas profesionales y fichas (vinculadas o pendientes de vincular). |
| `POST` | `/api/profesionales` | Crea ficha profesional vinculada a una cuenta profesional existente. |
| `GET` | `/api/profesionales/{document}` | Consulta el detalle de una ficha por documento. |
| `PUT` | `/api/profesionales/{document}` | Edita datos de ficha profesional sin otorgar verificación automática. |
| `PATCH` | `/api/profesionales/{document}/cuenta` | Vincula manualmente una ficha suelta a una cuenta profesional (`email`). |
| `PATCH` | `/api/profesionales/{document}/verificacion` | Aprueba (`VERIFICADA`) o solicita correcciones (`REQUIERE_CAMBIOS` + `note` obligatoria). |
| `PATCH` | `/api/profesionales/{document}/estado` | Activa o desactiva profesional/cuenta (`active`: `true` \| `false`). |
| `DELETE` | `/api/profesionales/{document}` | Elimina ficha profesional (y cuenta profesional vinculada si corresponde). |
| `DELETE` | `/api/profesionales/cuenta/{email}` | Elimina cuenta profesional sin ficha asociada. |

---

## 5. Pacientes, Antecedentes y Asignaciones (`PB-05`–`PB-09`)

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/pacientes` | `PACIENTES/READ` | Admin lista todos los activos; Profesional lista solo sus pacientes activos asignados. |
| `POST` | `/api/pacientes` | `PACIENTES/CREATE` | Registra paciente (`fullName`, `document`, `birthDate`, `phone`, `address`, `observations`). Si lo registra un profesional, lo auto-asigna a su cuenta. |
| `GET` | `/api/pacientes/historicos` | `PACIENTES/HISTORY_READ` | Lista pacientes inactivos (acotado a asignados en el caso de profesional). |
| `GET` | `/api/pacientes/{id}` | `PACIENTES/READ` | Obtiene detalle de un paciente. |
| `PUT` | `/api/pacientes/{id}` | `PACIENTES/UPDATE` | Actualiza datos de un paciente activo (inactivos son solo lectura). |
| `PATCH` | `/api/pacientes/{id}/estado` | `PACIENTES/DEACTIVATE` | Desactiva lógicamente al paciente conservando sus antecedentes. |
| `GET` | `/api/pacientes/{id}/antecedentes` | `ANTECEDENTES/READ` + `PACIENTES/READ` | Lista antecedentes clínicos del paciente. |
| `POST` | `/api/pacientes/{id}/antecedentes` | `ANTECEDENTES/CREATE` + `PACIENTES/READ` | Agrega antecedente (`type`, `description`, `date`) a paciente activo. |
| `GET` | `/api/antecedentes/{id}` | `ANTECEDENTES/READ` + `PACIENTES/READ` | Consulta un antecedente específico. |
| `PUT` | `/api/antecedentes/{id}` | `ANTECEDENTES/UPDATE` + `PACIENTES/READ` | Modifica antecedente de paciente activo. |
| `GET` | `/api/pacientes/asignaciones` | `ADMINISTRADOR` (`ASIGNACIONES/READ`) | Directorio paginado (`page`, `size`, `patientStatus`, `assignmentStatus`) de asignaciones. |
| `GET` | `/api/pacientes/{id}/asignacion` | `ADMINISTRADOR` (`ASIGNACIONES/READ`) | Historial completo de asignaciones del paciente. |
| `PUT` | `/api/pacientes/{id}/asignacion` | `ADMINISTRADOR` (`ASIGNACIONES/ASSIGN`) | Asigna o reasigna (`professionalEmail`) cerrando la asignación previa. |
| `DELETE` | `/api/pacientes/{id}/asignacion` | `ADMINISTRADOR` (`ASIGNACIONES/END`) | Finaliza la asignación vigente conservando el historial. |

---

## 6. Citas Médicas (`CITAS`)

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/citas` | `CITAS/READ` | Lista citas (en profesional, filtradas a sus pacientes asignados vigentes). |
| `POST` | `/api/citas` | `CITAS/CREATE` | Crea cita (`patientId`, `professionalId` si es admin, `date` ISO/timestamptz, `item` motivo). |
| `PUT` | `/api/citas/{id}` | `CITAS/UPDATE` | Actualiza fecha, motivo o estado (`PROGRAMADA`, `COMPLETADA`, `CANCELADA`). |
| `DELETE` | `/api/citas/{id}` | `CITAS/UPDATE` | Marca la cita como `CANCELADA`. |

---

## 7. Ejercicios, Catálogo y Rutinas (`PB-10`–`PB-19`)

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/ejercicios/catalogo` | `EJERCICIOS/READ` | Lista el banco completo de ejercicios activos ordenados por categoría y nombre. |
| `POST` | `/api/ejercicios/catalogo` | `EJERCICIOS/CREATE` | Crea un ejercicio (`name`, `category`, `description`, `restrictions` opcionales separadas por coma). |
| `PUT` | `/api/ejercicios/catalogo/{id}` | `EJERCICIOS/CREATE` | Modifica `name`, `category`, `description` y `restrictions` de un ejercicio activo del catálogo (`PB-12`). |
| `GET` | `/api/ejercicios/catalogo/{patientId}` | `EJERCICIOS/READ` | Evalúa el catálogo contra los `antecedentes` del paciente (`PB-19`); devuelve `blocked: boolean` y `alerts: string[]`. |
| `GET` | `/api/ejercicios/planes` | `EJERCICIOS/READ` | Lista los ejercicios de rutinas activas e históricas (`active: boolean`) de pacientes activos (`PB-18`). |
| `POST` | `/api/ejercicios/planes` | `EJERCICIOS/CREATE` | Agrega un ejercicio a la rutina (`patientId`, `exerciseId`, `frequency`, `sets`, `repetitions`, `durationMinutes`, `notes`). Devuelve HTTP `409` si existe contraindicación clínica (`PB-14`–`PB-16`, `PB-19`). |
| `PUT` | `/api/ejercicios/planes/{id}` | `EJERCICIOS/CREATE` | Modifica parámetros (`frequency`, `sets`, `repetitions`, `durationMinutes`, `notes`) y/o estado `active` (`true`/`false`) de una rutina (`PB-17`). Valida contraindicaciones si queda activa. |
| `GET` | `/api/ejercicios` | `EJERCICIOS/READ` | Lista registros históricos de `seguimientos_ejercicios`. |

> **Nota sobre trazabilidad de permisos:** Las operaciones `PUT` del módulo `EJERCICIOS` se autorizan mediante `EJERCICIOS/UPDATE` o `EJERCICIOS/CREATE` en [SeniorManageApiServer.java](../../backend/src/presentation/SeniorManageApiServer.java) para preservar compatibilidad con los 12 permisos clínicos configurables definidos en `permission-matrix-approved.csv`.
