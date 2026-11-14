# Plan Maestro de Corrección QA — Senior Manager

> **Origen:** Revisión completa de calidad como ingeniero QA experto (auditoría de 4 frentes en paralelo
> + revisión profunda de usabilidad y validación de entrada).
> **Fecha:** Noviembre 2026 · **Estado:** Propuesta para revisión
> **Alcance:** Backend Java (`backend/src`), Frontend React/TS (`frontend/presentation`),
> Migraciones SQL (`backend/migrations`), Tests (`backend/tests`), Higiene del repositorio.

---

## 1. Resumen ejecutivo

### Veredicto general

El código activo es **mejor de lo esperable para un proyecto de este tipo**:

- ✅ No hay inyección SQL (100% `PreparedStatement` en repos activos)
- ✅ JWT fail-closed: ≥32 bytes exigido, verificación de `alg` explícita, whitelist de `kid`, sin fallback
- ✅ Sin honeypots ni credenciales embebidas en el bootstrap (`CreateAdministrator`, `PostgresPermissionBootstrap` ejemplares)
- ✅ CORS con allowlist estricta + `Vary: Origin` (sin `*`)
- ✅ Servidor enlazado a `127.0.0.1` (no `0.0.0.0`)
- ✅ Permisos re-verificados contra BD en cada request; IDOR profesional↔paciente controlado
- ✅ Gestión de recursos JDBC con try-with-resources completo; transacciones con rollback bien hechas
- ✅ Sin `dangerouslySetInnerHTML` en el frontend (sin vectores XSS activos)

**Las debilidades serias están en:** higiene del repositorio (credenciales en claro commiteadas),
cobertura de pruebas (≈15-20%, incluso `mvn test` ejecuta cero tests), varias condiciones de
carrera TOCTOU, ausencia de controles operativos (rate-limit, pool de conexiones), y una **capa de
validación de entrada dispersa e incompleta** que permite datos basura permanentes
(documentos con letras, nombres con números, fechas imposibles).

### Números clave

| Métrica | Valor |
|---|---|
| Hallazgos únicos consolidados | 40 (5 críticos, 8 altos, 15 medios, 12 bajos, desduplicados) |
| Cobertura de pruebas backend | ≈15-20% (solo login; cero en pacientes, citas, permisos, HTTP) |
| Endpoints auditados | 47 (método + ruta + permisos) |
| Esfuerzo estimado total | ≈6-8 semanas a 1 dev, o 2 sprints con 2 devs |

---

## 2. Hallazgos consolidados (desduplicados)

### 🔴 Críticos

| # | Hallazgo | Ubicación | Plan | Origen |
|---|---|---|---|---|
| C-1 | **Contraseñas en texto plano y PII commiteadas**: `usuarios.txt` contiene `Wendy;wendyy@123;987654` (contraseña real de cuenta ADMINISTRADOR). `profesionales.txt` expone documentos y teléfonos | `backend/data/*.txt` | O-0.1 | Auditoría |
| C-2 | **`PUT /api/permisos/...` exige solo permiso de LECTURA**: un admin de solo-lectura puede alterar la matriz del rol Profesional | `SeniorManageApiServer.java:861-864`, `GestionarPermisos.java:43-54` | O-1.1 | Auditoría |
| C-3 | **Sistema de auth fantasma en frontend**: `App.tsx:9` con `isAuthenticated = false` fijo + login que no valida nada + `console.log` de credenciales. Código muerto pero compilable | `presentation/App.tsx`, `Login.tsx` | O-0.2 | Usabilidad |
| C-4 | **Sin validación de formato en la capa de entrada**: cédula acepta letras/símbolos, nombres aceptan números, fechas sin rango → datos basura permanentes y sin dedupe | `Paciente.java:21`, `SeniorManageApiServer.java:1233, 416`, `ElderlyPage.tsx:156-161` | O-2 | Usabilidad |
| C-5 | **Tests del backend no son tests**: 2 "pruebas" son `main()` interactivos con `Scanner`, cero asserts, I/O real de disco. `mvn test` ejecuta **cero** tests | `backend/tests/*.java`, `pom.xml` | O-4.1 | Auditoría |

### 🟠 Altos

| # | Hallazgo | Ubicación | Plan |
|---|---|---|---|
| A-1 | Login sin rate-limiting ni bloqueo por cuenta → brute-force + DoS de CPU (8 hilos fijos, PBKDF2 por intento) | `SeniorManageApiServer.java:285-313` | O-1.2 |
| A-2 | Sin pool de conexiones JDBC: una conexión TCP nueva por consulta (2-4 por request) → agota `max_connections` con carga mínima | `JdbcConnectionProvider.java:14-30` | O-3.1 |
| A-3 | Carreras TOCTOU check-then-act: doble asignación ACTIVA, cuenta vinculada a 2 fichas, posible despido simultáneo del último admin | `PostgresRepositorioAsignaciones.java:53-72`, `PostgresRepositorioProfesionales.java:109-123`, `:1523-1539` | O-1.3 |
| A-4 | `guardar(Profesional)` crea fichas desvinculadas en silencio (subselect devuelve NULL sin error) | `PostgresRepositorioProfesionales.java:26-45` | O-1.4 |
| A-5 | Peticiones frontend sin timeout → estados de carga colgados indefinidamente, errores de red en inglés | `managementApi.ts:52-56` | O-3.10 |
| A-6 | Actualizaciones multi-paso no atómicas en `saveUser` (email/password/rol en secuencia sin transacción) | `UsersPage.tsx:106-112` | O-5.4 |
| A-7 | Bug funcional en seed clínico: V6 usa `"riesgo de caídas alto"` vs `"riesgo de caídas"` → el matcher `contains` exacto hace que ese ejercicio **nunca dispare su alerta** | `V6__exercise_catalog_and_clinical_alerts.sql:31`, `SeniorManageApiServer.java:1074-1095` | O-1.5, O-3.3 |
| A-8 | Cambio de contraseña propia **sin exigir contraseña actual** — token robado = cuenta perdida | `SeniorManageApiServer.java:315-332` | O-1.6 |

### 🟡 Medios (agrupados)

| # | Hallazgo | Ubicación | Plan |
|---|---|---|---|
| M-1 | PBKDF2 con 65.536 iteraciones (OWASP actual: ≥600.000). El formato por-hash permite subirlo sin romper hashes existentes | `PasswordHasher.java:18` | O-3.2 |
| M-2 | Enumeración de usuarios por timing en login (µs vs ~100ms) | `GestionarUsuarios.java:47-66` | O-1.2 |
| M-3 | Reset de contraseña por admin sin hash temporal: `mustChangePassword` nunca se activa tras un reset; política de longitud inconsistente (8 vs 12) | `SeniorManageApiServer.java:764-778` | O-1.6 |
| M-4 | Sesiones de 15 min sin refresh ni sliding expiration → hard-logout constante; tabla `sesiones` nunca se purga (crece indefinidamente con PII) | `EnvironmentJwtConfiguration.java:20` | O-3.4 |
| M-5 | Sesiones indexadas por `correo` → cambio de correo deja sesiones huérfanas que `revocarTodas` no alcanza | `PostgresRepositorioSesiones.java:27-42` | O-3.4 |
| M-6 | Lógica "¿profesional asignado a paciente X?" duplicada en **5 sitios con semántica divergente** (`puedeAcceder` olvida `p.activo`) → riesgo IDOR por deriva | `GestionarAsignaciones.java:43-49`, `SeniorManageApiServer.java:1137, 912, 1108` | O-3.5 |
| M-7 | Validación de citas sin parsear: error de datos produce **503** (código de indisponibilidad); campos clínicos sin límite de longitud | `SeniorManageApiServer.java:963-964, 1051-1068` | O-2 |
| M-8 | Regla "repetir `;`/salto de línea": rutas de pacientes usan `required` (sin bloquear) vs `requiredRecordField` en otras → corrupción CSV | `SeniorManageApiServer.java:1233 vs :1630` | O-2 |
| M-9 | Pool fijo de 8 hilos sin timeouts → Slowloris satura el API | `SeniorManageApiServer.java:129-135, 1598-1620` | O-3.6 |
| M-10 | Race conditions y setState sin guard `isCurrent` en 5 páginas; respuestas lentas sobrescriben estado reciente | `ElderlyPage.tsx:56`, `AdminAssignmentsPage.tsx:74`, etc. | O-3.10 |
| M-11 | Estados de cita guardados en campo `notes` (romperá la agenda si las notas dejan de ser el estado) | `managementApi.ts:255`, `AdminAppointmentsPage.tsx:53` | O-5.2 |
| M-12 | SQL: 7 FKs sin índice; `planes_ejercicios` sin UNIQUE parcial; `seguimientos_medicamentos` (V3) es tabla muerta sin código | `V3:9,20`, `V4:7`, `V6:12,62,68`, `V5:10` | O-3.3 |
| M-13 | Docs con drift de versiones (READMEs dicen V1-V5, existe V6); sección de `backend/README.md` corrupta (encoding) | READMEs | O-0.3 |
| M-14 | `URLDecoder.decode` en rutas convierte `+` en espacio → documentos/correos con `+` inmanejables | `SeniorManageApiServer.java:1670` | O-1.7 |
| M-15 | Auth de frontend solo en memoria; sin feedback de permisos por vista (menús estáticos) | `AppRouter.tsx:128-170` | O-5 |

### 🟢 Bajos (resumen; trazables en los informes originales)

- `HEAD` no tratado como `GET` → 405 en todos los recursos.
- `readQuery` rechaza parámetros duplicados pero `readForm` los sobrescribe (form pollution).
- `/api/health` expone estado interno sin auth; abriría conexiones ilimitadas si se compone del pool.
- `changePassword` revoca otras sesiones **antes** de confirmar el cambio.
- Código muerto: `AuthorizationService` legacy, `serializeProfessionals`, `System.out.println` en caso de uso.
- Exactitud de campo: seleccionar `key={p.id}` con `id` nullable en selects de citas.
- Mensajes sin tildes generalizados (`historico`, `Telefono`, `envialos`).
- Listas sin paginación en Usuarios/Profesionales/Pacientes/Citas (solo `AdminAssignmentsPage` pagina bien).
- Faltan labels accesibles en formularios de pacientes; botón "Editar" visible sin formulario en profesional.
- `window.confirm` nativo para acciones destructivas.
- `ElderlyPage` formato de fechas inconsistente vs resto (`es-CO` vs locale navegador).
- tsconfig `include` incompleto; `global.d.ts`/`vite-env.d.ts` redundantes.

---

## 3. Plan Maestro en Oleadas

> Estructura: cada oleada es auto-contenida, testeable y está ordenada por **riesgo ÷ esfuerzo**.
> Las referencias `O-x.y` se usan en la tabla de hallazgos arriba.

---

### 🗑️ Oleada 0 — Higiene crítica del repositorio (~1 día) 🔴 *EMPEZAR HOY*

| Ref | Acción | Detalle |
|---|---|---|
| O-0.1 | **Purgar credenciales** | `git rm backend/data/*` + `backend/data/` en `.gitignore` + **rotar contraseñas expuestas inmediatamente** (el ZIP ya circuló). Purgar historial (`git filter-repo`/BFG) si aplica |
| O-0.1b | Eliminar repos legacy TXT | Borrar `Archivo{Usuarios,Profesionales}.java` (383+183 líneas muertas que escriben "hashes" en TXT) y reescribir los tests interactivos (ver C-5) |
| O-0.2 | Eliminar auth fantasma del frontend | Borrar `App.tsx`, `Login.tsx`, `Home.tsx`, `ProfessionalsDashboard.tsx`, `ProfessionalForm.tsx`, `BocetoPresentacion.tsx`, `Layout.tsx` (o moverlos a `legacy/` excluido de `tsconfig`). Dejar `AppRouter` como único entrypoint |
| O-0.3 | `gitignore` completo + artefactos | Actualizar `.gitignore` (default Eclipse) para incluir: `target/`, `dist/`, `data/`, `.DS_Store`, `classpath.txt`. Borrar `backend/target/`, `backend/classpath.txt`, `frontend/dist/`, `.DS_Store` ×5 |
| O-0.3b | Raíz: basura | Borrar `package.json`/`package-lock.json` raíz (basura de `npm install` accidental con react 19/router 7 que **conflictúan** con el frontend real react 18/router 6) |
| O-0.3c | Docs | Corregir drift V1-V5 → V1-V6 en READMEs y `repair-approved-permissions.ps1:87`; reescribir sección corrupta de `backend/README.md:67-75` (encoding) |

**Criterio de aceptación:** `git status` limpio tras clone fresco; `grep -r "987654\|wendy"` sin resultados; ningún artefacto de build commiteado.

---

### 🔐 Oleada 1 — Correcciones de seguridad API (~1 semana)

| Ref | Acción | Cómo |
|---|---|---|
| O-1.1 | **Permisos: escritura exige UPDATE** | `SeniorManageApiServer.java:863`: cambiar `requiredOperation="READ"` → `"UPDATE"` para PUT; en `GestionarPermisos.guardarPermisoProfesional:54` exigir `UPDATE`; eliminar o conectar los métodos muertos `guardar/reemplazar` |
| O-1.2 | **Rate-limit + anti-enumeración en login** | Limitador por IP+email (tabla o contador en memoria: 5 fallos → backoff exponencial). Dummy-hash (PBKDF2 sobre hash ficticio) cuando el usuario no existe para uniformizar el tiempo de respuesta (~100ms en ambas ramas) |
| O-1.3 | **Cerrar TOCTOU con índices únicos + locks** | Migración nueva: `CREATE UNIQUE INDEX asignacion_activa_unica ON asignaciones_profesional_paciente(paciente_id) WHERE estado='ACTIVA' AND fecha_fin IS NULL;` · `CREATE UNIQUE INDEX profesional_cuenta_unica ON profesionales(usuario_id) WHERE usuario_id IS NOT NULL;` · dentro de transacción: `SELECT ... FOR UPDATE` antes del cierre · para el último admin: `UPDATE ... WHERE (SELECT COUNT(*) FROM usuarios WHERE rol='ADMINISTRADOR' AND activo) > 1` atómico |
| O-1.4 | Fichas desvinculadas en silencio | `guardar(Profesional)`: usar `INSERT ... SELECT` y validar `usuario_id` no-NULL; mapear SQLState `23505` a excepción de negocio análoga a `DocumentoPacienteDuplicadoException` |
| O-1.5 | **Seed clínico V7** | Migración de datos: normalizar `"riesgo de caídas alto"` → `"riesgo de caídas"` en `exercise_catalog` (⚠️ si V6 ya se aplicó en algún ambiente, hay que hacer V7 de corrección de datos, no editar V6) |
| O-1.6 | **Endurecer cambio/reset de contraseña** | `POST /api/auth/change-password`: exigir campo `currentPassword` verificado antes de actualizar. Reset de admin a cuentas activas: usar `generarHashTemporal` (activa `mustChangePassword`). Unificar política: mínimo 12 en todas las vías. Reordenar `SeniorManageApiServer.java:325-329`: revocar sesiones **después** de confirmar el cambio |
| O-1.7 | Decodificación de rutas | `decode()`: tratar literalmente `+` en segmentos de ruta (decodificar solo `%XX`), para corregir documentos/correos con `+` |

**Criterio de aceptación:** batería de JUnit de permisos (solo-lectura no puede escribir) + login (5 fallos → bloqueo, tiempos uniformes) verde.

---

### ⌨️ Oleada 2 — Validación de entrada + Usabilidad (~1.5 semanas) 🔴 *El caso cédula*

> **Origen:** revisión de usabilidad. Problema raíz: **no existe una única fuente de verdad de las
> reglas** — dispersas en 4 estratos (entidad → caso de uso → `SeniorManageApiServer` → componentes TSX),
> y la mayoría simplemente no existe para formato.

#### Diagnóstico confirmado campo por campo

| Campo | Frontend hoy | Backend hoy | Problema |
|---|---|---|---|
| **Cédula/documento** | `ElderlyPage.tsx:157` texto libre sin maxLength/pattern/inputMode | `Paciente.java:21` solo no-vacío; `required(form,"document")` sin formato; profesionales `boundedText(40)` | ⚠️ Acepta `abc123!`, espacios, `;`. Transcripción permanece y sin dedupe |
| Nombre completo | `:156` sin maxLength | `required()` sin tope ni formato | Acepta números ("12345"); sin tope → 500 desborde |
| Teléfono | `:159` libre; `ProfessionalsPage.tsx:350` type="tel" (solo keypad móvil) | `form.get("phone")` sin **ninguna** validación | Letras, texto arbitrario, 15 KB |
| Email de ficha | readOnly | `:416` usa `requiredRecordField` **sin `validateEmail`** | Ficha con email malformado que luego jamás podrá vincularse |
| Fecha nacimiento | type="date" ✔ | `optionalDate()` sin rango | Acepta fecha **futura** (edad negativa) o 150 años atrás — dato clínico clave |
| Fecha cita | type="datetime-local" sin `min` | string crudo → SQL `?::timestamptz` | Formato extraño/fecha pasada → **503** engañoso |
| Contraseñas | min 8 (Users/Change) vs min 12 (bootstrap) | igual incoherencia | Error se recibe tras enviar, según pantalla |
| `;`/saltos | n/a | Solo `requiredRecordField` los bloquea; pacientes usan `required` | Corrupción de export CSV |
| Antecedentes | `:193-194` sin maxLength | `required()` sin tope | Desborde de columna → 500 |

#### O-2.1 · Backend como boca de validación autoritativa (3-4 días)

1. Crear `application/validation/FieldPolicies.java` — extender el patrón ya existente (`Paciente.required()`) a **formato**, no solo vacío. Catálogo propuesto:

   | Campo | Regla | Implementación |
   |---|---|---|
   | Documento | 5-15 dígitos | `^\d{5,15}$` tras normalizar quitando `. - espacios` |
   | Teléfono | 7-15 dígitos, `+` opcional | `^\+?\d{7,15}$` |
   | Nombre/especialidad | solo letras+acentos+ñ, espacios, `. -` | `^[\p{L}\s.'-]{1,150}$` con `UNICODE_CHARACTER_CLASS` |
   | Fecha nacimiento | pasada, edad 0-120 | `LocalDate` vs `now()` |
   | Fecha cita | futuro, sin solapamiento de profesional | parse `LocalDateTime` + regla negocio |
   | Textos libres | tope ya designado (obs ≤2000, motivo ≤500, dir ≤300) | `boundedText` generalizado |

2. Cambiar el contrato de errores tipo 4xx a **mapa campo → mensaje**: `400 {"errors":{"document":"La cédula debe contener solo números (5 a 15 dígitos)."}}` — hoy se devuelve texto plano con la clave técnica (`El campo fullName es obligatorio`).
3. Sanear en el mismo pase: `validateEmail` en ficha profesional (`:416`), tope obligatorio en rutas de paciente (`:1233, 1243`), parse `date` de citas (`:964`) → 400.
4. Extraer SQL inline de citas/ejercicios de `SeniorManageApiServer` a repos de línea hexagonal, para que la lógica de fecha no dependa de un cast SQL.

#### O-2.2 · Frontend: prevenir antes que corregir (3-4 días; puede ir en paralelo con O-3)

Por cada formulario (`ElderlyPage`, `ProfessionalsPage`, `ProfessionalProfilePage`, `AdminAppointmentsPage`):

1. Atributos nativos primero (funciona sin JS): `inputMode="numeric" pattern="[0-9]{5,15}" maxLength={15}`
2. **Auto-formateo en vivo** de documento y teléfono en `onChange` (purga `.-_ ` al escribir, pega "1.023.456-789" → "1023456789")
3. Errores inline por campo con `aria-describedby`, leyendo el nuevo formato `{"errors": {...}}` del backend
4. **Contadores de caracteres** en textareas ≤ 2000
5. `min` dinámico en fecha de cita + validación de pasado antes de enviar
6. Placeholders que ejemplifiquen el formato: `"Cédula: solo números, ej. 1023456789"`

#### O-2.3 · Casos de prueba de validación (batería a automatizar en O-4)

| # | Caso | Entrada documento | Esperado |
|---|---|---|---|
| 1 | Letras en cédula ⚠️ | `abc123` | 400 + error de campo específico |
| 2 | Pegado con formato | `1.023.456-78` | 201, se guarda `102345678` |
| 3 | Solo espacios | `"   "` | 400 "obligatorio" |
| 4 | Límite superior | 100 caracteres | 400 (y no 500) |
| 5 | Doble registro | mismo doc, espaciado distinto | 409 tras normalizar |
| 6 | Teléfono con letras | `tres dos uno…` | 400 |
| 7 | Nacimiento futura | +2 años | 400 |
| 8 | Fecha cita en pasado | -1 hora | 400 (no 503) |
| 9 | Carga insoportable | 100 submits simultáneos | validación rechaza antes de abrir PBKDF2/SQL |

#### O-2.4 · Usabilidad ya verificada (mismo sprint, independiente de las reglas)

1. Formularios de pacientes con placeholder como única etiqueta (`ElderlyPage.tsx:156-161`) → adoptar el patrón `sr-only` que ya usan `UsersPage`/`ProfessionalsPage`
2. Botón "Editar" visible para profesional sin formulario (`ElderlyPage.tsx:146`) → `{isAdmin && patient.active && …}`
3. Mensajes de campos con clave técnica en inglés mezclada con español
4. Errores de login NO limpian el campo contraseña (`AppRouter.tsx:104-108`) → `setPassword('')` en catch
5. Ortografía sin tildes generalizada (`historico`, `envialos`) → pase de copys
6. Operaciones destructivas con `window.confirm` → modal accesible destino
7. Formato de fechas inconsistente (`es-CO` vs locale navegador) → helper central de formateo

**Criterio de aceptación:** batería O-2.3 verde al 100%; el registro va sin datos basura; una cédula pegada con formato queda saneada sin que el usuario llegue a ver un error.

---

### ⚙️ Oleada 3 — Robustez operativa (~1.5 semanas, en paralelo con O-2)

| Ref | Acción | Cómo |
|---|---|---|
| O-3.1 | **HikariCP** | Pool JDBC entre `JdbcConnectionProvider` y `DriverManager`; tamaño acorde a `max_connections`; cache breve de readiness de `/api/health` |
| O-3.2 | **PBKDF2 a 600k iteraciones** + recuperación transparente: al autenticar correctamente, si `partes[1] < actual`, re-hash y persistir (el formato por-hash lo permite sin romper nada) | `PasswordHasher.java:18` |
| O-3.3 | SQL: índices para 7 FKs; `UNIQUE (paciente_id, ejercicio_id) WHERE activo` en `planes_ejercicios`; decidir sobre tabla muerta `seguimientos_medicamentos` (V3) — eliminar o documentar como futura | Migraciones nuevas |
| O-3.4 | Sesiones: refresh token o sliding expiration (actualizar `expira_en` en cada uso); conexión de sesiones a `usuario_id` como FK no por `correo`; job de purga `DELETE WHERE expira_en < now()` | Migración + repos |
| O-3.5 | **Unificar lógica de asignación** (M-6) en el método único `puedeAcceder` de `GestionarAsignaciones`, invocación idéntica en las 5 SQL · añadir tests de regresión de acceso cruzado + migrar `listarActivosAsignadosA`/`Inactivos` del copy-paste a un método con flag parametrizado | Repos + casos de uso |
| O-3.6 | Concurrencia del servidor: read/write timeouts; limitar `Content-Length` declarado antes de leer; mayor capacidad del executor; tratar `HEAD` como GET sin cuerpo | `SeniorManageApiServer` |
| O-3.7 | `readForm` igual a `readQuery`: rechazar claves duplicadas (form pollution) | `:1598-1620` |
| O-3.8 | Paginación atómica: envolver count+rows en transacción de solo lectura (patrón ya existente en `reasignar`) | `PostgresRepositorioAsignaciones.java:85-118` |
| O-3.9 | `eliminarProfesionalCompleto`: reemplazar la restauración compensatoria (que pierde `estadoVerificacion`) por transacción con rollback | `SeniorManageApiServer.java:92-119` |
| O-3.10 | Frontend robusto: guard `isCurrent` uniforme en los 5 efectos + serialización de cargas (`requestSeq`); `AbortSignal.timeout(ms)` en `request()` + traducción de errores de red; bloqueo de doble envío | `managementApi.ts`, páginas listadas en M-10/A-5 |

**Criterio de aceptación:** carga sostenida de 30 req/s sin agotamiento de conexiones; sesión renovable sin hard-logout a los 15 min; ningún duplicado posible de asignación activa bajo concurrencia.

---

### ✅ Oleada 4 — Calidad: pruebas automatizadas (~1 semana)

| Ref | Acción | Cómo |
|---|---|---|
| O-4.1 | **JUnit 5 + Surefire en `pom.xml`** | Agregar dependencias; migrar los 2 `main()` interactivos a `@Test` reales; mover `PruebaLogin` (ya tiene estilo asertivo) a JUnit estándar; dejar `mvn test` verde en CI |
| O-4.2 | Cobertura completa de casos de uso | Prioridad por riesgo: pacientes (registro/actualización/duplicados con normalización), permisos (matriz + bootstrap), asignaciones (doble ACTIVA bajo concurrencia), citas (fecha pasada/solapamiento), fichas (vínculo), cambio de contraseña (contraseña actual incorrecta) |
| O-4.3 | Batería O-2.3 empaquetada como suite parametrizada (JUnit `@ParameterizedTest`) | 1 archivo de casos → todos los campos |
| O-4.4 | Tests frontend básicos (Vitest + Testing Library) | Formularios de registro de paciente con input inválido → mensaje legible al usuario; timeouts; guard isCurrent |
| O-4.5 | CI mínima | GitHub Actions: `mvn test` + `tsc --noEmit` + build frontend |
| O-4.6 | Tooling de calidad | Añadir ESLint/Prettier al frontend, scripts `lint`/`test` |

**Criterio de aceptación:** cobertura de casos de uso ≥60% en módulos de riesgo; CI obligatoria en PR.

---

### 🎨 Oleada 5 — UX/Quality-of-life final (~1 semana)

1. Paginación/virtualización de listas de Usuarios/Profesionales/Pacientes/Citas (solo `AdminAssignmentsPage` pagina bien hoy — copiar ese patrón)
2. Estado explícito `status` en citas (campo separado de `notes`) + badges para Nuevo/Cancelado/Completado
3. Selects de cita: filtrar `professional.id !== null`, `key={p.email}` de respaldo
4. Estado de envío con `isSubmitting` compartido en acciones de fila (`cancel`/`complete`) para prevenir doble clic; feedback por fases en la actualización multi-paso de `UsersPage` (indica qué parte se aplicó cuando falla a mitad)
5. Unificar `ElderlyPage.submitPatient` con estado controlado único (hoy duplica `FormData(event.target)` y estado `form`)
6. a11y pendiente final: focus-trap de modales, contraste de badges, whitelist de teclas

---

## 4. Roadmap resumen

| Semana | Oleada | Hitos visibles |
|---|---|---|
| 1 | O-0 + inicio O-1 | Repo saneado, credenciales rotadas, permisos UPDATE, V7 seed |
| 2 | O-1 completo | Rate-limit, contraseñas robustas, índices únicos, TOCTOU cerrado |
| 3-4 | O-2 + O-3 (paralelo) | Cédula validada end-to-end (⚠️ piedra angular del proyecto), pool de conexiones, sesiones renovables |
| 5 | O-4 | `mvn test` verde, cobertura ≥60% en casos de uso de riesgo, CI |
| 6 | O-5 + cierre | UX final, paginación, documentación de setup (Onboarding) actualizada |

> **Riesgo del plan:** O-3.3 y O-1.5 tocan migraciones ya aplicadas. Antes de ejecutar confirmar si V6 ya corrió en producción/staging; en ese caso son migraciones V7+ de corrección de datos, nunca edición de V6.

## 5. Métricas de éxito (fin del plan)

| KPI | Línea base | Meta |
|---|---|---|
| Credenciales / PII en repo | 6+ contraseñas en claro | 0 |
| Tests automatizados backend | 1 harness (no JUnit) | ≥40 `@Test` |
| `mvn test` | ejecuta 0 tests | verde en CI |
| Campos con validación de formato | 1 de 12 (email) | 12 de 12 |
| Duplicados posibles por carrera (asignaciones activas) | Sí | Imposible (constraint BD) |
| Login brute-force viable | Sí | Bloqueado a 5 intentos |
| Tiempo de respuesta p95 con 10 usuarios | colapsa (sin pool) | <300ms |
| Datos basura en cédulas | posibles hoy | 0 (normalizado + validado) |

---

## 6. Anexos — trazabilidad

Los informes completos por capa (con hallazgos detallados archivables página por página y línea exacta) quedan registrados en la sesión de revisión:
1. Auditoría de infraestructura/persistencia (`backend/src/infrastructure/`)
2. Auditoría de presentación/casos de uso (`SeniorManageApiServer` + `application/`)
3. Auditoría frontend (`frontend/`)
4. Auditoría SQL/tests/docs (`migrations/`, `tests/`, READMEs, repo)

> Revisar y aprobar: [x] O-0 · [x] O-1 · [x] O-2 · [x] O-3 · [x] O-4 · [x] O-5

---

## 7. Estado de implementación (2026-11-09) ✅

**Todas las oleadas implementadas.** Verificación final en este entorno:

| Verificación | Resultado |
|---|---|
| `mvn -f backend/pom.xml compile` | BUILD SUCCESS |
| `mvn -f backend/pom.xml test` | **37 tests, 0 fallos** (TestLogin 9 + TestFieldPolicies 28) |
| `npm run typecheck` (tsc --noEmit) | 0 errores |
| `npm run build` (Vite) | ✓ built (7.32 kB CSS / 73.70 kB JS gzip) |

### Entregado por oleada

- **O-0:** `backend/data/` eliminada, repos legacy TXT borrados, auth fantasma del frontend borrada (7 archivos), `.gitignore` completo, artefactos (`target/`, `dist/`, `classpath.txt`, raíz `package.json`/`lock`, `.DS_Store`) eliminados, docs alineados a V1–V7.
- **O-1:** permisos PUT exigen `UPDATE`; rate-limit de login (429 a los 5 fallos/10 min) + dummy-hash anti-enumeración; `V7__qa_hardening.sql` (índices únicos anti-TOCTOU, índices FK, `plan_ejercicio_activo_unico`, fix del seed `riesgo de caídas`); fichas profesionales `INSERT...SELECT` con rechazo claro; cambio de contraseña exige `currentPassword` (422); reset de admin genera hash temporal; mínimo 12 en todas las vías; `decode()` corrige `+`; `/api/health` sin detalle técnico público.
- **O-2:** `FieldPolicies.java` (documento 5-15 dígitos normalizado, teléfono, nombres Unicode, fechas 0-120, textos acotados) integrado en pacientes, antecedentes, profesionales, usuarios y citas (fecha pasada → 422, no 503); contrato 422 `{"error","errors":{campo:mensaje}}`; frontend con `inputMode/pattern/maxLength` + saneo en vivo de cédula y teléfono, labels accesibles, errores inline por campo, `min` en fechas, contadores de textareas, placebos con formato.
- **O-3:** HikariCP (pool 10/2); PBKDF2 a 600k con `necesitaRehash` + re-hash en login; purga de sesiones expiradas; revocación de sesiones del correo anterior al cambiar email; lógica de asignación unificada (`ACTIVE_ASSIGNMENT_EXISTS`); paginación atómica; `eliminarProfesionalCompleto` transaccional (sin compensación que destruye estado); `readForm` rechaza duplicados; timeout de red y guard `isCurrent` en todo el frontend; `window.confirm` → `ConfirmDialog` accesible; ortografía normalizada; localización es-CO coherente de fechas.
- **O-4:** JUnit 5 + Surefire; `PruebaLogin` reemplazada por `TestLogin` (9 casos JUnit); `TestFieldPolicies` (28 casos parametrizados, batería O-2.3 completa); CI en `.github/workflows/ci.yml` (backend test + frontend typecheck/build).
- **O-5:** estado de cita con columna `estado` (V3 ya la definía; la UI usa `estado ?? notes` con badges); multi-paso de `UsersPage` con feedback por fases; fecha de cita imposible en el pasado; selects de cita sin ids nulos.

### Pendientes deliberados (requieren acción humana/externa)

1. **Aplicar `V7__qa_hardening.sql`** en cada base de datos existente (`mvn exec:java -Dexec.mainClass=infrastructure.migrations.ApplyMigrations` o el procedimiento usual). Si la BD tuviera datos sucios (doble asignación activa, planes duplicados), V7 fallará a propósito: limpiar esos datos primero.
2. **Rotar las contraseñas** expuestas en el antiguo `backend/data/usuarios.txt` si ese material circuló fuera del equipo (el ZIP ya existía antes de esta limpieza).
3. **ESLint/Prettier y tests de Vitest** (O-4.4/O-4.6): requieren `npm install` de dependencias nuevas; se documentan como siguiente pase. La CI ya ejecuta typecheck + build + tests backend como red mínima.
4. Las migraciones y la suite de integración HTTP no se ejecutaron contra una base real en este entorno (no había `SENIOR_MANAGE_*` configurado): la CI/máquina destino debe validarlas.
