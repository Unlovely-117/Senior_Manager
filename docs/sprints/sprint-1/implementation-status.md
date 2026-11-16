# Estado de implementación — Sprint 1

**Actualizado:** 2026-11-15  
**Estado del Sprint 1 (`PB-01`, `PB-02`, `PB-03`, `PB-04`, `PB-26`):** **Completado**.

---

## 1. Alcance implementado

### Seguridad y Autenticación (`PB-01`, `PB-02`, `PB-26`)
- **Login endurecido (`POST /api/auth/login`):** hash `PBKDF2WithHmacSHA256` a `210 000` iteraciones con límite de `128` caracteres, verificación en tiempo constante contra `DUMMY_HASH` cuando el correo no existe o está inactivo, y rate limiting en memoria (`HTTP 429` tras 8 intentos fallidos en 300 s).
- **Sesión JWT revocable (`GET /api/auth/me`, `POST /api/auth/logout`):** tokens HS256 de 15 minutos con `jti` persistido y validado en la tabla `sesiones` de PostgreSQL.
- **Cambio de contraseña temporal (`POST /api/auth/change-password`):** bloquea las demás rutas hasta reemplazar contraseñas temporales (`TEMPORARY$`) e invalida sesiones previas.
- **Eliminación de persistencia legada TXT:** eliminados `backend/data/*.txt` y repositorios de archivo (`ArchivoUsuarios`, `ArchivoProfesionales`); PostgreSQL es el único almacenamiento.

### Usuarios, Profesionales, Roles y Permisos (`PB-03`, `PB-04`, `PB-26`)
- **Usuarios y roles ([UsersPage.tsx](../../../frontend/presentation/pages/UsersPage.tsx)):** alta, edición, restablecimiento de contraseña, cambio de rol (`admin`/`professional`), activación/desactivación (con revocación inmediata de sesiones) y eliminación protegiendo al último administrador activo.
- **Directorio y verificación profesional ([ProfessionalsPage.tsx](../../../frontend/presentation/pages/ProfessionalsPage.tsx), [ProfessionalProfilePage.tsx](../../../frontend/presentation/pages/ProfessionalProfilePage.tsx)):** autogestión de ficha por el profesional (`PENDIENTE`) y revisión administrativa (`VERIFICADA` / `REQUIERE_CAMBIOS`). Los profesionales sin ficha verificada no pueden operar rutas clínicas (`HTTP 403`).
- **Matriz oficial de permisos ([permission-matrix-approved.csv](../../../backend/config/permission-matrix-approved.csv)):**
  - `ADMINISTRADOR`: **26 permisos** permanentes de control total.
  - `PROFESIONAL`: **12 permisos** clínicos configurables desde [AdminPermissionsPage.tsx](../../../frontend/presentation/pages/AdminPermissionsPage.tsx) (`GET /api/permisos/mis-permisos` para reflejo dinámico en UI).

---

## 2. Verificación del backend y frontend

- `mvn -f backend/pom.xml -o test-compile`: **compilación correcta** (46 fuentes principales + 3 pruebas).
- `mvn -f backend/pom.xml -o exec:java -Dexec.classpathScope=test -Dsenior.manage.mainClass=PruebaLogin`: **`PruebaLogin: 14 casos/verificaciones correctos.`**
- `npm --prefix frontend run typecheck`: **pasó** sin errores TypeScript (`tsc --noEmit`).

---

## 3. Documentos relacionados

- Índice consolidado de Sprints: [docs/sprints/README.md](../README.md)
- Sprint 2: [docs/sprints/sprint-2/README.md](../sprint-2/README.md)
- Sprint 3: [docs/sprints/sprint-3/README.md](../sprint-3/README.md)
- Auditoría de seguridad y despliegue VPS/Docker: [REVISION_SEGURIDAD_Y_DESPLIEGUE_VERCEL.md](../../REVISION_SEGURIDAD_Y_DESPLIEGUE_VERCEL.md)
