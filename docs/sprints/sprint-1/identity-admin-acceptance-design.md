> **Aviso: documento histórico.** Este archivo registra el estado de su sprint. Las menciones a persistencia TXT, migraciones pendientes o funciones ausentes reflejan esa fecha; consulta docs/README.md para la situación actual.

# Sprint 1 â€” Identidad estable, interfaces administrativas y aceptaciÃ³n

**Tipo:** propuesta tÃ©cnica para revisiÃ³n.  
**Base:** inspecciÃ³n estÃ¡tica del cÃ³digo disponible al 15 de octubre de 2026.  
**EjecuciÃ³n:** no se ejecutaron pruebas, compilaciones, servidores, migraciones ni conexiones a PostgreSQL. No se inspeccionÃ³ `backend/data/`.  
**Estado:** las propuestas de identidad UUID y la matriz de permisos continÃºan pendientes. Los contratos agregados descritos abajo estÃ¡n implementados en el cÃ³digo fuente, pero no han sido ejecutados ni validados en runtime.

Este documento complementa `implementation-status.md` y `technical-decisions-proposal.md`. Mantiene las decisiones aprobadas del Sprint 1: Java 17, PostgreSQL/JDBC, Flyway explÃ­cito, JWT HS256, denegaciÃ³n por defecto y arquitectura por capas. No propone activar permisos ni ejecutar el bootstrap.

### ImplementaciÃ³n frontend posterior a esta propuesta

- `AdminAssignmentsPage` usa el directorio agregado paginado y el directorio profesional, confirma asignacion/reasignacion/finalizacion y carga el historial al expandirlo. Tras una mutacion confirmada, vuelve a consultar la pagina filtrada y conserva abierto el historial devuelto por la mutacion. Ante 5xx o perdida de conexion muestra resultado incierto e intenta reconciliar solo el paciente afectado.
- El cliente conserva el status HTTP, tolera errores sin JSON y rechaza una respuesta exitosa vacÃ­a/no objeto. Un 5xx o respuesta de mutaciÃ³n invÃ¡lida no se presenta como â€œsin cambiosâ€: la escritura pudo ocurrir antes de fallar la lectura/serializaciÃ³n del historial. La interfaz ofrece actualizaciÃ³n manual y reconciliaciÃ³n focalizada para ese caso; solo permite una mutaciÃ³n a la vez.
- El directorio ahora expone `accountActive` y `profileActive` por separado (`null` cuando no hay ficha/cuenta correspondiente); la interfaz ofrece solo cuentas y fichas activas. El backend mantiene su validaciÃ³n al asignar.
- `GET /api/pacientes/asignaciones` agrega paciente y asignaciÃ³n relevante con paginaciÃ³n acotada y filtros. La carga inicial no solicita historiales individuales; el historial completo se consulta al expandirlo.
- `AdminPermissionsPage` quedÃ³ implementada como consulta de solo lectura para las celdas que el backend consulta. Muestra decisiones existentes y ausencia de configuraciÃ³n como denegaciÃ³n por defecto. No tiene control de escritura y no llama al endpoint `PUT`.
- `managementApi.ts` conserva el status HTTP en `ApiRequestError`, tolera respuestas de error vacÃ­as/no JSON y mantiene la invalidaciÃ³n local/evento de sesiÃ³n para 401.
- Las vistas se integraron en `AdminMenu` y `AppRouter`; `managementService.ts` expone las operaciones y `domain/models/management.ts` declara DTOs de asignaciÃ³n y permiso. Los componentes se muestran dentro de la rama de rol administrador; la autorizaciÃ³n efectiva continÃºa en el backend.
- Esto es evidencia de archivos y llamadas estÃ¡ticas, no de integraciÃ³n o funcionamiento. No se resolviÃ³ Maven, no se iniciÃ³ el frontend/backend y no se ejecutaron pruebas ni typecheck/build.
- La pantalla de permisos no puede completar administraciÃ³n hasta contar con matriz explÃ­citamente aprobada, tratamiento aprobado para autoescalamiento y una allow-list que permita habilitar Ãºnicamente celdas aprobadas. La ruta de escritura existente, por sÃ­ sola, no prueba que sea seguro habilitar controles genÃ©ricos.
- La identidad UUID para usuarios/profesionales continÃºa como propuesta: no se modificaron entidades, TXT, API, asignaciones ni migraciones.

## Estado posterior a la implementaciÃ³n y migraciÃ³n (2026-10-15)

- `Usuario` y `Profesional` ahora exponen UUID inmutables; sus adaptadores PostgreSQL conservan los UUID asignados durante la importaciÃ³n.
- V2 incorpora `usuarios`, `profesionales`, vÃ­nculo opcional `usuario_id` y `asignaciones_profesional_paciente.profesional_id`, manteniendo `profesional_email` como dato histÃ³rico.
- La importaciÃ³n Ãºnica lee solo `usuarios.txt` y `profesionales.txt`, no los modifica, transforma cualquier contraseÃ±a de texto plano a PBKDF2, mantiene los hashes PBKDF2 existentes, y rechaza repeticiÃ³n, registros invÃ¡lidos o duplicados. La operaciÃ³n en la base local se confirmÃ³ con 5 cuentas, 0 fichas y una marca de importaciÃ³n.
- El vÃ­nculo cuenta-ficha durante migraciÃ³n se hace solo ante correspondencia inequÃ­voca por correo normalizado y rol profesional. Las asignaciones sin vÃ­nculo UUID no autorizan el acceso.
- Pacientes, antecedentes y asignaciones no se importaron desde TXT: el flujo actual solo contempla cuentas y fichas, y no se encontraron adaptadores TXT para esos mÃ³dulos en esta implementaciÃ³n.
- La matriz de permisos sigue sin aprobar ni inicializarse. No se validaron login, flujos HTTP, permisos, historial, ni recuperaciÃ³n tras reinicio. El documento siguiente a este encabezado conserva el diseÃ±o anterior como contexto histÃ³rico; cuando contradiga lo implementado, prevalece este estado actualizado y `implementation-status.md`.

## 1. Identidad estable

### 1.1 Hechos actuales

- `domain.entities.Usuario` no tiene ID; `RepositorioUsuarios` busca, actualiza y elimina por correo.
- `domain.entities.Profesional` tampoco tiene ID; su repositorio busca por documento.
- `AsignacionProfesionalPaciente` contiene UUID de asignaciÃ³n y paciente, pero almacena `profesionalEmail` como identidad.
- `GestionarAsignaciones` vincula la ficha profesional con la cuenta mediante correo. `PostgresRepositorioAsignaciones` consulta y autoriza usando ese correo.
- Las cuentas y fichas existentes siguen usando adaptadores TXT. Este diseÃ±o no inspeccionÃ³ sus archivos ni presupone su formato exacto.

### 1.2 Modelo propuesto

Usar UUID generados una sola vez y no reutilizables:

| Entidad | Identidad propuesta | RelaciÃ³n propuesta |
|---|---|---|
| Usuario/cuenta | `usuario_id UUID` | Cero o una ficha profesional vinculada; rol, estado y correo son atributos mutables. |
| Profesional/ficha | `profesional_id UUID` | Cero o una cuenta vinculada; no se deduce identidad del correo ni del documento. |
| AsignaciÃ³n | Conservar `asignacion_id UUID` actual | FK `paciente_id` y FK `profesional_id`; fechas y estado conservan historia. |

La relaciÃ³n cuenta-ficha debe ser explÃ­cita y opcional mientras se resuelven cuentas sin ficha y fichas sin cuenta. Si el negocio confirma que es uno-a-uno, imponer unicidad para los IDs vinculados. Una asignaciÃ³n apunta a la ficha profesional; los permisos de acceso requieren ademÃ¡s que esa ficha estÃ© activa y que exista una cuenta activa vinculada con rol profesional. De esa manera, cambiar el correo no cambia las asignaciones y desactivar la cuenta o ficha sÃ­ puede cerrar el acceso segÃºn la polÃ­tica aprobada.

No se recomienda usar correo, nombre, documento ni hash de estos valores como clave primaria. Correos y documentos pueden cambiar, tener errores histÃ³ricos o duplicados; ademÃ¡s son datos personales.

### 1.3 Compatibilidad TXT sin inspeccionar datos

Primero se debe revisar el formato mediante documentaciÃ³n o muestras sintÃ©ticas creadas fuera de los datos reales; este trabajo no se ha realizado. El adaptador TXT futuro debe leer registros legados y nuevos a travÃ©s de un modelo con UUID:

1. Definir formato versionado con `usuario_id` y `profesional_id`, manteniendo por el periodo de compatibilidad los campos actuales.
2. Para registros antiguos, mantener un **registro de correspondencias** persistente, aprobado y respaldado, entre la clave legada elegida y el UUID asignado. La clave legada es solo una clave de migraciÃ³n; no serÃ¡ identidad futura.
3. No regenerar UUID en cada lectura. Si una clave legada se modifica o no se reconoce, el adaptador debe fallar cerrado y reportar conflicto, no crear silenciosamente una identidad nueva.
4. Especificar escrituras compatibles con versiÃ³n antigua/nueva y recuperaciÃ³n ante escritura parcial antes de habilitar escrituras en el nuevo formato. Los TXT actuales no ofrecen una transacciÃ³n conjunta entre usuarios, profesionales y asignaciones.

No se selecciona aquÃ­ si el registro de correspondencias debe ser un archivo lateral o una ampliaciÃ³n de cada TXT: falta conocer y aprobar el formato, la atomicidad requerida, el mecanismo de respaldo y quiÃ©n realizarÃ¡ la conversiÃ³n. La alternativa recomendada es incorporar UUID directamente al formato versionado y usar una correspondencia temporal solo durante la transiciÃ³n.

### 1.4 TransiciÃ³n futura a PostgreSQL

Propuesta de fases, sin ejecutar:

1. **Inventario autorizado:** fijar formatos TXT, conteos y reglas de normalizaciÃ³n sin publicar datos personales; hacer respaldo verificable y definir recuperaciÃ³n.
2. **Mapeo previo:** generar UUID una sola vez por registro y producir reporte de duplicados/correspondencias incompletas sin importar ni sobrescribir datos.
3. **ResoluciÃ³n humana:** decidir conflictos antes de carga; no fusionar cuentas o fichas automÃ¡ticamente.
4. **Esquema aditivo versionado:** aÃ±adir tablas de usuarios y profesionales con UUID, correo/documento con restricciones aprobadas, estado y marcas de origen. AÃ±adir a asignaciones el `profesional_id` nullable y mantener `profesional_email` legado para trazabilidad temporal.
5. **Backfill controlado:** importar usuarios y perfiles preservando UUID; relacionar asignaciones por correspondencia aprobada. Verificar conteos, unicidad, asociaciones y asignaciones huÃ©rfanas. Sin eliminar ni reescribir filas histÃ³ricas por conjetura.
6. **Cambio de lectura/escritura:** migrar adaptadores detrÃ¡s de interfaces de repositorio; mantener TXT como fuente de recuperaciÃ³n hasta aceptaciÃ³n del corte. Definir ventana de solo lectura o mecanismo de doble escritura con reconciliaciÃ³n antes de elegirlo.
7. **Restricciones finales:** solo tras resolver todos los huÃ©rfanos, imponer `NOT NULL` y FK de profesional en asignaciones. Eliminar la columna legada Ãºnicamente en otra versiÃ³n, despuÃ©s de respaldo y criterio de rollback aprobados.

La migraciÃ³n futura debe conservar UUID de pacientes y asignaciones existentes, fechas, estados y valores de correo legados para auditorÃ­a. No se debe inferir `profesional_id` a partir del correo actual si hay ambigÃ¼edad.

### 1.5 Excepciones de datos y seguridad

- **Duplicados:** detener el backfill de las filas afectadas; resolver identidad con responsable funcional y evidencia autorizada. No escoger â€œprimero encontradoâ€.
- **Cambio de correo:** actualizar atributo de cuenta y perfil vinculados por IDs; mantener los UUID de asignaciÃ³n. Definir si el historial registra correo al momento de asignar como dato de auditorÃ­a.
- **Cuenta inactiva:** conservar cuenta y relaciones; negar nuevas sesiones y acceso operativo. La polÃ­tica de acceso de solo lectura histÃ³rica debe aprobarse aparte.
- **Sin correspondencia cuenta-ficha:** mantener registros separados y sin vÃ­nculo; no conceder acceso de profesional hasta conciliaciÃ³n aprobada.
- **AsignaciÃ³n sin profesional resoluble:** preservar la fila, marcarla como incidencia de migraciÃ³n fuera del camino de autorizaciÃ³n y denegar acceso profesional hasta resoluciÃ³n.

### 1.6 Cambios futuros y dependencias

| Ãrea / archivo o componente | Cambio futuro | Dependencia previa |
|---|---|---|
| `domain/entities/Usuario.java` | AÃ±adir UUID inmutable y modelar correo como mutable. | Decidir formato y ciclo de vida del ID. |
| `domain/entities/Profesional.java` | AÃ±adir UUID inmutable independiente de documento/correo. | Resolver perfiles sin cuenta y reglas de duplicado. |
| `domain/entities/AsignacionProfesionalPaciente.java` | Sustituir correo como identidad por `profesionalId`; opcionalmente guardar correo histÃ³rico separado. | Esquema, auditorÃ­a y polÃ­tica de identidad aprobados. |
| `domain/RepositorioUsuarios.java`, `RepositorioProfesionales.java`, `RepositorioAsignaciones.java` | Operaciones de bÃºsqueda/actualizaciÃ³n por UUID; alta de vÃ­nculo cuenta-ficha. | Contratos de dominio acordados. |
| `application/usecases/GestionarUsuarios.java`, `GestionarUsuariosProfesionales.java`, `GestionarAsignaciones.java` | Vincular, cambiar correo y validar estado/rol por IDs. | Reglas de ciclo de vida y transacciÃ³n. |
| `infrastructure/ArchivoUsuarios.java`, `ArchivoProfesionales.java` | Lectura compatible, UUID durables y estrategia de escritura/recuperaciÃ³n. | Formatos TXT, respaldos y corte aprobados. |
| `infrastructure/PostgresRepositorioAsignaciones.java` y nuevos repositorios de identidad | Uniones por UUID/FK. | MigraciÃ³n de identidad y esquema PostgreSQL. |
| `backend/migrations/V2__stable_identity.sql` (nombre propuesto) | Tablas/columnas/FK aditivas y restricciones por etapas. | RevisiÃ³n SQL, mapeo, backup/restore y estrategia de rollback. No crear/aplicar ahora. |
| `presentation/SeniorManageApiServer.java` y DTOs | Respuestas de asignaciÃ³n con IDs estables y operaciÃ³n de vÃ­nculo explÃ­cita. | Contrato API versionado y compatibilidad cliente. |
| `frontend/domain/models/management.ts`, `frontend/infrastructure/managementApi.ts` | Tipos/operaciones por UUID y tratamiento del vÃ­nculo. | Contratos backend aprobados. |

## 2. Interfaces administrativas

### 2.1 Contratos que sÃ­ existen

Rutas observadas en `SeniorManageApiServer`:

| PropÃ³sito | MÃ©todo y ruta | Cuerpo / respuesta observada | AutorizaciÃ³n de backend observada |
|---|---|---|---|
| Listar pacientes activos | `GET /api/pacientes` | `Patient[]` | SesiÃ³n; permiso `PACIENTES/READ`. Profesional recibe pacientes asignados. |
| Directorio paginado de pacientes y asignaciÃ³n | `GET /api/pacientes/asignaciones?page=0&size=25&patientStatus=ACTIVO&assignmentStatus=TODAS` | `{items:[{patient:{id,fullName,document,active},assignmentState,currentAssignment,lastAssignment}],page,size,total}` | Solo administrador; sesiÃ³n vÃ¡lida, `PACIENTES/READ` y `ASIGNACIONES/READ`. |
| Listar pacientes histÃ³ricos | `GET /api/pacientes/historicos` | `Patient[]` | SesiÃ³n; `PACIENTES/HISTORY_READ`; profesionales habilitados y asignados. |
| Ver historial de asignaciÃ³n por paciente | `GET /api/pacientes/{id}/asignacion` | Array `{id, patientId, professionalEmail, active, startDate, endDate}` | Rol administrador y `PACIENTES/READ` mÃ¡s `ASIGNACIONES/READ`. |
| Asignar o reasignar | `PUT /api/pacientes/{id}/asignacion` | Form `professionalEmail`; respuesta: historial de asignaciones | Rol administrador y `PACIENTES/READ` mÃ¡s `ASIGNACIONES/ASSIGN`. |
| Finalizar asignaciÃ³n activa | `DELETE /api/pacientes/{id}/asignacion` | Respuesta: historial; 404 si no hay activa | Rol administrador y `PACIENTES/READ` mÃ¡s `ASIGNACIONES/END`. |
| Listar profesionales | `GET /api/profesionales` | Lista de `Professional` segÃºn serializador existente | Administrador y permiso `PROFESSIONALS/READ`. |
| Leer permisos de un rol | `GET /api/permisos/{rol}` | Array `{module, operation, allowed}` | Administrador y `PERMISOS/READ`. |
| Guardar una celda de permiso | `PUT /api/permisos/{rol}/{modulo}/{operacion}` | Form `allowed`; mensaje de confirmaciÃ³n | Administrador y `PERMISOS/UPDATE`. |

El directorio agregado filtra patientStatus=ACTIVO|INACTIVO|TODOS y assignmentStatus=ACTIVA|FINALIZADA|SIN_ASIGNACION|TODAS; page es base cero, size admite 1-100 y el orden es estable por nombre e ID. Sin historial devuelve assignmentState=NONE; una asignacion finalizada se expone en lastAssignment y currentAssignment queda null. La lista incluye solo nombre, documento y estado del paciente, no observaciones ni campos clinicos. SQL usa placeholders JDBC. Los fallos de persistencia producen el error 503 comun. El historial completo sigue disponible en GET /api/pacientes/{id}/asignacion, sujeto a rol administrador y permisos PACIENTES/READ y ASIGNACIONES/READ.

`GET /api/profesionales` conserva el campo legado `active` y `hasProfile`; aÃ±ade `accountActive` (null para perfiles sin cuenta) y `profileActive` (null cuando falta la ficha). Los campos son aditivos y no cambian las rutas ni la regla de elegibilidad vigente en `GestionarAsignaciones`.

El menÃº `AdminMenu` ofrece las vistas de adultos, profesionales y usuarios, pero no asignaciones ni permisos. `AdminDashboardPage` calcula profesionales y usuarios desde API, mientras la tarjeta de adultos aÃºn muestra literalmente `Demo` y â€œMÃ³dulo en etapa de prototipoâ€. En contraste, `ElderlyPage` llama a las funciones API de pacientes e historial. La tarjeta del dashboard es, por tanto, explÃ­citamente de demostraciÃ³n; el cÃ³digo de la pÃ¡gina de adultos estÃ¡ conectado a la API segÃºn inspecciÃ³n estÃ¡tica, sin validaciÃ³n de ejecuciÃ³n.

### 2.2 Estructura propuesta para asignaciones

La pantalla administrativa implementada estÃ¡ enlazada al menÃº. Sus flujos actuales son:

1. **Carga inicial:** consultar pacientes activos y profesionales activos. Mostrar carga, error recuperable y vacÃ­o diferenciados.
2. **Filas de pacientes:** mostrar nombre/documento, estado independiente del paciente, estado actual/finalizado/sin historial y responsable; el historial completo se solicita al abrir el detalle.
3. **Acciones:** seleccionar profesional activo y confirmar asignaciÃ³n/reasignaciÃ³n; finalizar mediante confirmaciÃ³n explÃ­cita. Tras Ã©xito, volver a consultar estado e historial desde API.
4. **Historial:** mostrar asignaciones previas como inmutables, incluyendo fechas y estado. No presentar una reasignaciÃ³n como reemplazo de la historia.
5. **Errores:** `401` limpiar sesiÃ³n y volver al flujo de autenticaciÃ³n existente; `403` mostrar falta de autorizaciÃ³n sin reintentar; `503` informar indisponibilidad y conservar los datos/formulario no enviados. Para cualquier error de red, no mostrar confirmaciÃ³n de Ã©xito.
6. **Carreras:** el servidor es autoridad. Ante conflicto/respuesta no exitosa, recargar el historial; no inferir que el Ãºltimo valor local ganÃ³.

La pantalla esta conectada estaticamente al directorio agregado y a las rutas existentes de asignacion. Las mutaciones y el historial por paciente conservan sus contratos actuales; esto no acredita funcionamiento en ejecucion.

### 2.3 Pantalla de permisos y matriz pendiente

La pantalla de consulta implementada tiene selector de rol, tabla por mÃ³dulo/operaciÃ³n, decisiones leÃ­das y marcador â€œsin configurar Â· denegadoâ€. TambiÃ©n explica el control del backend. La ediciÃ³n, confirmaciÃ³n y recarga tras escritura siguen bloqueadas: no existe lista aprobada de valores permitidos y la pantalla no debe exponer escritura arbitraria ni botÃ³n de bootstrap.

La siguiente tabla enumera **solo celdas reconocidas por los checks del backend**. Los valores quedan **PENDIENTES DE APROBACIÃ“N HUMANA**. â€œPendienteâ€ no es grant ni instrucciÃ³n para guardar `true`; mientras no exista una decisiÃ³n configurada, la autorizaciÃ³n actual deniega.

| MÃ³dulo | Acciones que el backend consulta | Administrador | Profesional |
|---|---|---|---|
| `USERS` | `READ`, `CREATE`, `UPDATE`, `DELETE` | Pendiente | Pendiente |
| `PROFESSIONALS` | `READ`, `CREATE`, `UPDATE`, `DELETE` | Pendiente | Pendiente |
| `PERMISOS` | `READ`, `UPDATE` | Pendiente | Pendiente |
| `PACIENTES` | `READ`, `CREATE`, `UPDATE`, `DEACTIVATE`, `HISTORY_READ` | Pendiente | Pendiente |
| `ANTECEDENTES` | `READ`, `CREATE`, `UPDATE` | Pendiente | Pendiente |
| `ASIGNACIONES` | `READ`, `ASSIGN`, `END` | Pendiente | Pendiente |

AdemÃ¡s de la celda, el backend impone roles administrativos para usuarios, profesionales, permisos y gestiÃ³n de asignaciones. Un valor `true` por sÃ­ solo no elimina esos controles. Antes de habilitar ediciÃ³n UI falta decidir quiÃ©n puede cambiar permisos, si se protege contra autoescalamiento y Ãºltimo administrador, si las operaciones por paciente se delegan a profesionales y cuÃ¡les son los datos de auditorÃ­a. No se propone ni se ejecuta matriz inicial.

## 3. Plan de aceptaciÃ³n (definido, no ejecutado)

| ID | Caso verificable | Tipo | Evidencia esperada |
|---|---|---|---|
| A01 | Credencial incorrecta y cuenta inactiva no emiten sesiÃ³n. | AceptaciÃ³n | 401; no se entrega token ni se registra sesiÃ³n activa. |
| A02 | Token malformado, firma incorrecta, `kid` desconocido, issuer/audience incorrectos y token vencido se rechazan. | IntegraciÃ³n | 401; ningÃºn handler protegido ejecuta operaciÃ³n. |
| A03 | Logout invalida el `jti`; reutilizar el mismo token se rechaza. | IntegraciÃ³n | ValidaciÃ³n posterior a logout retorna 401. |
| A04 | Cambiar rol/inactivar usuario invalida acceso del token previo. | IntegraciÃ³n | Rol actual no coincide o cuenta inactiva; solicitud protegida denegada. |
| A05 | Sesiones revocadas/vigentes mantienen el estado tras reiniciar servidor, con DB disponible. | IntegraciÃ³n | Token revocado sigue rechazado; token vigente sigue sujeto a exp y estado de cuenta. |
| A06 | CaÃ­da/timeout de PostgreSQL al consultar revocaciÃ³n no concede acceso. | IntegraciÃ³n | Error 503; no se procesa operaciÃ³n protegida. |
| A07 | Profesional consulta un paciente asignado activo y no puede consultar otro sin asignaciÃ³n, llamando directamente API. | AceptaciÃ³n | Resultado autorizado solo para asignado; otro retorna 403. Requiere permisos aprobados. |
| A08 | Profesional con cuenta o ficha inactiva no accede aunque exista fila de asignaciÃ³n. | IntegraciÃ³n | DenegaciÃ³n backend. |
| A09 | Asignar a perfil/cuenta profesional habilitados conserva UUID de asignaciÃ³n y registra inicio. | IntegraciÃ³n | Fila activa y respuesta incluye historial. |
| A10 | Reasignar finaliza asignaciÃ³n anterior y crea una nueva en operaciÃ³n atÃ³mica. | IntegraciÃ³n | Historia conserva ambas; como mÃ¡ximo una activa por paciente. |
| A11 | Finalizar dos veces no crea historia extra ni permite nuevas operaciones del profesional anterior. | IntegraciÃ³n | Primera operaciÃ³n finaliza; segunda responde ausencia de asignaciÃ³n activa; acceso se deniega. |
| A12 | Cambiar correo vinculado no modifica identidad ni asignaciones despuÃ©s de transiciÃ³n a UUID; antes de esta, correo anterior falla cerrado. | IntegraciÃ³n | El ID conserva asociaciones; no hay acceso con identidad no reconciliada. |
| A13 | Documento duplicado normalizado se rechaza al registrar/actualizar, incluidas solicitudes concurrentes. | IntegraciÃ³n | Conflicto controlado; una sola identidad de paciente. |
| A14 | Campos obligatorios/invÃ¡lidos se rechazan en API aunque el cliente omita validaciones. | AceptaciÃ³n | Error de validaciÃ³n sin escritura. Reglas de campos por aprobar. |
| A15 | Consulta y actualizaciÃ³n retornan estado persistido correcto y respetan permisos. | AceptaciÃ³n | Lectura posterior refleja valor; sin asignaciÃ³n o permiso, denegaciÃ³n. |
| A16 | DesactivaciÃ³n lÃ³gica conserva ID, datos, antecedentes y asignaciones histÃ³ricas; paciente no aparece en lista activa. | IntegraciÃ³n | Sin borrado en cascada; rutas de escritura posteriores denegadas. |
| A17 | MÃºltiples antecedentes permanecen asociados al mismo paciente; acceso directo a antecedente valida paciente padre/asignaciÃ³n. | IntegraciÃ³n | FK e ID padre correctos; usuario no asignado recibe 403. |
| A18 | Sin permiso, permiso duplicado o fuente de permisos indisponible no concede acceso. | IntegraciÃ³n | DenegaciÃ³n 403/503 segÃºn fallo; no hay fallback por rol. |
| A19 | Frontend muestra carga, error, vacÃ­o y Ã©xito solo con respuesta exitosa; 401/403/503 no produce mensaje de guardado. | AceptaciÃ³n | Estados visibles y sesiÃ³n actualizada conforme al cÃ³digo HTTP. |
| A20 | Backfill de identidad detecta IDs/correos/documentos duplicados, huÃ©rfanos y vÃ­nculos ambiguos sin alterar origen. | IntegraciÃ³n | Reporte de conflictos; migraciÃ³n se detiene sin pÃ©rdida ni asignaciÃ³n inferida. |
| A21 | RestauraciÃ³n desde respaldo recupera usuarios, profesionales, pacientes, antecedentes, sesiones y asignaciones segÃºn retenciÃ³n aprobada. | AceptaciÃ³n | Conteos y asociaciones conciliados tras restore en entorno aislado. |
| A22 | SeparaciÃ³n de capas: casos de uso dependen de puertos, y los adaptadores TXT/JDBC implementan contratos equivalentes. | RevisiÃ³n estÃ¡tica | Sin imports de formato TXT/JDBC en dominio; diferencias cubiertas por pruebas contractuales. |
| A23 | Una mutaciÃ³n de asignaciÃ³n con 5xx, conexiÃ³n perdida o cuerpo de Ã©xito vacÃ­o no se presenta como confirmada; reconciliar solo el historial de ese paciente. | AceptaciÃ³n | Mensaje de resultado incierto, sin Ã©xito engaÃ±oso y con historial actualizado si la consulta posterior responde. |
| A24 | El directorio agregado aplica permisos, filtros, lÃ­mite de pÃ¡gina y orden estable; profesionales y pacientes no asignados no reciben la vista administrativa. | IntegraciÃ³n | 403 para profesional; pÃ¡ginas sin duplicados ni omisiones en un conjunto sintÃ©tico estable; los campos clÃ­nicos no se incluyen. |
| A25 | El directorio profesional expone por separado estado de cuenta y estado/existencia de ficha, y la selecciÃ³n de asignaciÃ³n omite estados inactivos. | AceptaciÃ³n | Datos sintÃ©ticos de las combinaciones cuenta/ficha activa, inactiva y ausente; backend vuelve a validar al asignar. |

Las pruebas de integraciÃ³n/aceptaciÃ³n requieren entorno aislado, datos sintÃ©ticos, secretos provisionados de prueba, matriz aprobada y estrategia de respaldo. No deben conectarse a datos reales.

## 4. Estado PB-01 a PB-08

Estado conforme con `implementation-status.md`; la propuesta no cambia el estado de tareas:

| PB | Estado actual | Motivo resumido |
|---|---|---|
| PB-01 | Parcial | JWT y configuraciÃ³n externa en fuente; falta validaciÃ³n de ejecuciÃ³n y configuraciÃ³n operativa. |
| PB-02 | Parcial | RevocaciÃ³n persistente por `jti` en fuente; faltan DB/migraciÃ³n ejecutada y pruebas de ciclo de sesiÃ³n. |
| PB-03 | Parcial | Usuarios/profesionales siguen TXT y carecen de ID inmutable; falta estrategia de transiciÃ³n. |
| PB-04 | Bloqueado | Matriz y hash de aprobaciÃ³n humana ausentes; sin permisos sembrados. |
| PB-05 | Parcial | CÃ³digo/API/JDBC presentes; falta aceptaciÃ³n con DB y polÃ­tica de datos completa. |
| PB-06 | Parcial | Contratos y pantalla de asignaciÃ³n en fuente; los grants siguen pendientes y no hay validaciÃ³n dinÃ¡mica de autorizaciÃ³n/persistencia. |
| PB-07 | Parcial | ActualizaciÃ³n y desactivaciÃ³n lÃ³gica en fuente; falta aceptaciÃ³n de persistencia y concurrencia. |
| PB-08 | Parcial | MÃºltiples antecedentes y asociaciÃ³n en fuente; falta validar autorizaciÃ³n y persistencia en ejecuciÃ³n. |

## 5. Decisiones y contratos pendientes

1. Aprobar cardinalidad cuenta-profesional, campos de contacto y polÃ­tica de registros sin vÃ­nculo.
2. Aprobar formato versionado TXT, estrategia UUID/correspondencia temporal, operaciÃ³n de corte, respaldo y rollback.
3. Aprobar reglas para duplicados y cambios de documento/correo, y si se conserva correo histÃ³rico en cada asignaciÃ³n.
4. Aprobar polÃ­tica por rol para cada celda de matriz, autoescalamiento, Ãºltimo administrador y auditorÃ­a. No hay valores aprobados.
5. Revisar el contrato agregado implementado y validar su autorizaciÃ³n, filtros, paginaciÃ³n y consultas en un entorno de prueba aislado; no se ha ejecutado.
6. Definir polÃ­tica de acceso a pacientes inactivos, antecedentes y revocaciÃ³n tras finalizar una asignaciÃ³n.
7. Acordar criterios/entorno de restauraciÃ³n, datos sintÃ©ticos y disponibilidad controlada de PostgreSQL para aceptaciÃ³n.

**Conclusion:** el diseno de identidad UUID y la matriz de permisos siguen pendientes. El endpoint agregado y la exposicion separada de estado de cuenta/ficha se implementaron en fuente y se integraron en el cliente y la pantalla administrativa. Persisten pendientes la validacion dinamica, aprobacion de grants y migracion de identidad; no se afirma funcionamiento en ejecucion.

> **Nota de vigencia (2026-10-16):** este diseÃ±o de aceptaciÃ³n es histÃ³rico. La persistencia TXT descrita en el documento fue migrada a PostgreSQL y los archivos locales retirados. Consulta el estado actual del proyecto para decisiones vigentes.

