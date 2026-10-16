> **Aviso: documento histórico.** Este archivo registra el estado de su sprint. Las menciones a persistencia TXT, migraciones pendientes o funciones ausentes reflejan esa fecha; consulta docs/README.md para la situación actual.

# Current migration status - 2026-10-15

The API now uses PostgreSQL repositories for users and professionals as well as patients, histories, assignments, sessions and permissions. The one-time legacy import evidence records 5 user rows and 0 professional rows; the current TXT inventory is 5 and 0 respectively. The TXT files remain preserved as backups and are not active API storage. See `implementation-status.md` for the latest integration state. The review below is historical and is superseded where it describes TXT as active storage.

# Sprint 1 â€” revisiÃ³n de entrega

RevisiÃ³n estÃ¡tica del repositorio realizada el 2026-10-15. No se ejecutaron pruebas de API ni de persistencia durante esta revisiÃ³n.

## Checklist de entrega

- [x] **Cumplido â€” ProtecciÃ³n administrativa (revisiÃ³n estÃ¡tica).** Los manejadores `/api/usuarios` y `/api/profesionales` llaman a `requireAdministrator`; este exige una sesiÃ³n vÃ¡lida y comprueba el rol `ADMINISTRADOR`. La protecciÃ³n no se verificÃ³ mediante pruebas de solicitudes HTTP.
- [x] **Cumplido â€” Datos de Pacientes/expedientes identificados.** La vista Adultos mayores/Mis adultos mayores declara que muestra datos de demostraciÃ³n, no expedientes clÃ­nicos, y que no se guardan en el backend (`frontend/presentation/pages/ElderlyPage.tsx`).
- [x] **Cumplido â€” Persistencia no probada.** La persistencia no se probÃ³ en esta revisiÃ³n. La compilaciÃ³n de Java realizada anteriormente solo confirma compilaciÃ³n; no prueba lectura, escritura ni conservaciÃ³n de datos.
- [ ] **Bloqueado â€” Requisitos acordados de Sprint 1.** No se pueden marcar individualmente como cumplidos o pendientes: este repositorio no contiene la lista acordada. `docs/requirements/README.md` y la documentaciÃ³n original de este sprint son plantillas que solicitan documentar requisitos, alcance y criterios de aceptaciÃ³n. Registrar aquÃ­ la lista aprobada para evaluarla requisito por requisito.
- [x] **Cumplido â€” Estado de datos y cambios.** No se modificaron los datos de `backend/data` ni el cÃ³digo de la aplicaciÃ³n durante esta revisiÃ³n. No se realizaron cambios de Ãºltimo minuto a funcionalidades sin pruebas.

## Alcance de la revisiÃ³n

La protecciÃ³n administrativa se inspeccionÃ³ leyendo el cÃ³digo, sin probarla en ejecuciÃ³n. Los datos de pacientes son de demostraciÃ³n segÃºn la interfaz; el repositorio no aporta evidencia de expedientes clÃ­nicos reales conectados. La existencia de adaptadores de archivo para usuarios y profesionales no cuenta como prueba de persistencia.

## Escenarios de aceptaciÃ³n proporcionados

Estados de esta matriz basados en inspecciÃ³n estÃ¡tica. **Pendiente** significa que el comportamiento debe probarse antes de considerarlo aceptado. **Bloqueado** significa que la funcionalidad o sus criterios no estÃ¡n presentes en el repositorio.

| Ãrea y escenario | Estado | Evidencia / brecha |
| --- | --- | --- |
| AutenticaciÃ³n: credenciales incorrectas | Pendiente | `GestionarUsuarios.autenticarUsuario` valida las credenciales; falta ejecutar el caso negativo por API. |
| AutenticaciÃ³n: usuario inactivo | Pendiente | El servidor rechaza cuentas inactivas al autenticar y vuelve a comprobar el estado en sesiÃ³n; falta probar ambos casos. |
| AutenticaciÃ³n: rol seleccionado distinto al asignado | Pendiente | `AppRouter` compara el rol devuelto y cierra sesiÃ³n si no coincide; falta probar el flujo. |
| Sesiones: token vencido | Pendiente | `requireSession` compara `expiresAt` con la hora actual y elimina tokens vencidos; falta probar la respuesta y el acceso posterior. |
| Sesiones: cierre de sesiÃ³n | Pendiente | `/api/auth/logout` elimina el token del mapa de sesiones y el cliente lo retira de `sessionStorage`; falta probar que deja de autorizar. |
| Sesiones: acceso directo a rutas | Pendiente | La interfaz restaura la sesiÃ³n mediante `/api/auth/me` y las rutas de datos validan sesiÃ³n; falta probar URL directa y llamadas API sin token. |
| Sesiones: cambios de permisos | Pendiente | `requireSession` compara estado y rol actuales con los guardados en la sesiÃ³n y la invalida si difieren; falta probar cambios durante una sesiÃ³n activa. |
| AutorizaciÃ³n: profesional invoca operaciones administrativas directamente por API | Pendiente | Los manejadores de usuarios y profesionales exigen rol administrador en el servidor; falta probar solicitudes directas de rol profesional y comprobar denegaciÃ³n. |
| Pacientes: documento duplicado, campos invÃ¡lidos, consulta y actualizaciÃ³n | Bloqueado | No se encontraron modelo, endpoints ni persistencia de pacientes. La vista existente utiliza una lista fija de demostraciÃ³n. |
| Antecedentes: mÃºltiples por paciente, asociaciÃ³n y retenciÃ³n tras desactivar paciente | Bloqueado | No se encontraron entidades, endpoints ni almacenamiento de pacientes o antecedentes; tampoco estÃ¡ definido quÃ© significa desactivar un paciente en esta implementaciÃ³n. |
| Persistencia: conservar datos tras reinicio | Pendiente | Hay adaptadores TXT para usuarios y profesionales; no existe adaptador de pacientes identificado. No se reiniciÃ³ la aplicaciÃ³n ni se verificÃ³ conservaciÃ³n. |
| Persistencia: no tratar demostraciones como reales | Cumplido por inspecciÃ³n estÃ¡tica | La vista de residentes etiqueta expresamente sus registros como datos de demostraciÃ³n y dice que no se guardan en el backend. No sustituye las pruebas de persistencia de datos reales. |

No se ejecutaron los escenarios de esta matriz. Los resultados estÃ¡ticos no equivalen a aprobaciÃ³n de pruebas de aceptaciÃ³n.

## ActualizaciÃ³n de implementaciÃ³n â€” 2026-10-15

Esta actualizaciÃ³n contrasta el cÃ³digo con PB-01 a PB-08 y el Sprint Backlog de Notion. La auditorÃ­a fue estÃ¡tica; no se ejecutaron pruebas, compilaciones ni migraciones.

| PB | Estado segÃºn inspecciÃ³n | Evidencia y brecha principal |
| --- | --- | --- |
| PB-01 â€” Inicio de sesiÃ³n | Parcial | `GestionarUsuarios.autenticarUsuario`, `/api/auth/login` y `AppRouter` validan credenciales, cuenta activa y rol seleccionado. El backend emite un token opaco, no el JWT firmado requerido por la historia; algoritmo, duraciÃ³n y clave estÃ¡n pendientes. |
| PB-02 â€” Cierre de sesiÃ³n | Parcial | `/api/auth/logout`, `signOut` y `AppRouter.handleSignOut` limpian sesiÃ³n y salen de vistas protegidas. Se agregÃ³ confirmaciÃ³n visible cuando responde correctamente. Falta validar los flujos en ejecuciÃ³n; un error remoto se muestra como error y no como Ã©xito. |
| PB-03 â€” Usuarios profesionales | Parcial | `GestionarUsuarios`, `GestionarUsuariosProfesionales` y los handlers de `/api/usuarios` y `/api/profesionales` implementan operaciones existentes. No se verificÃ³ cada criterio de aceptaciÃ³n en ejecuciÃ³n ni la consistencia ante fallos entre TXT. |
| PB-04 â€” Roles y permisos | Parcial | Hay repositorio PostgreSQL, API administrativa y comprobaciÃ³n por mÃ³dulo/operaciÃ³n con denegaciÃ³n predeterminada. Requiere ademÃ¡s rol administrador y permisos efectivos `PERMISOS/READ` o `PERMISOS/UPDATE`. Faltan matriz aprobada, bootstrap, esquema aplicado e interfaz de configuraciÃ³n. |
| PB-05 â€” Registro de pacientes | Parcial | Entidad, validaciÃ³n de requeridos, API y adaptador JDBC con unicidad de documento en el esquema borrador. Faltan dependencia JDBC, esquema aplicado y validaciÃ³n en ejecuciÃ³n. |
| PB-06 â€” Consulta de pacientes | Parcial | API/frontend consultan por lista e ID; el listado distingue activo e inactivo. Los profesionales se deniegan hasta aprobar e implementar asignaciones; falta validar persistencia. |
| PB-07 â€” ActualizaciÃ³n de pacientes | Parcial | API, caso de uso, adaptador y desactivaciÃ³n lÃ³gica presentes. Falta validar unicidad concurrente y almacenamiento; la polÃ­tica de consulta/ediciÃ³n de inactivos sigue pendiente. |
| PB-08 â€” Antecedentes | Parcial | Entidad genÃ©rica, asociaciÃ³n, mÃºltiples registros, API, consulta y actualizaciÃ³n con JDBC. Rutas exigen permiso de antecedentes y permiso correspondiente de pacientes; faltan esquema aplicado y pruebas futuras. |

### Persistencia y decisiones

`SeniorManageApiServer` sigue usando `ArchivoUsuarios` y `ArchivoProfesionales` para esas entidades. Pacientes, antecedentes y permisos se conectan por cÃ³digo a adaptadores JDBC PostgreSQL. El controlador no estÃ¡ declarado, el esquema no se ha aplicado y no hay herramienta de migraciÃ³n elegida; por ello no se ha verificado persistencia operativa. No se inspeccionaron datos almacenados ni se migraron TXT.

Notion mantiene Sprint 1 como â€œPlanificadoâ€ y las tareas del Sprint Backlog consultadas como â€œEn progresoâ€; esos estados no acreditan aceptaciÃ³n. Para avanzar con PB-04 a PB-08 se requieren la matriz de permisos, reglas de pacientes inactivos y asignaciÃ³n profesional-paciente, campos obligatorios, normalizaciÃ³n documental, catÃ¡logo de antecedentes y decisiones de conexiÃ³n/migraciones PostgreSQL.

La consulta de Git y rama fue rechazada por la protecciÃ³n de propiedad del repositorio. No se cambiÃ³ la configuraciÃ³n de Git para eludirla; por ello este informe no certifica el estado de rama o archivos pendientes.
### Contratos preparados en la continuaciÃ³n

- `domain/RepositorioPermisos.java` y `domain/entities/Permiso.java` definen un puerto genÃ©rico; ahora tienen adaptador JDBC y comprobaciÃ³n en `AuthorizationService`. No hay matriz inicial ni concesiones predeterminadas.
- `infrastructure/security/JwtConfiguration.java` requiere que una futura implementaciÃ³n provea clave, algoritmo y duraciÃ³n; no contiene valores por defecto y todavÃ­a no se usa para emitir o verificar tokens.
- `infrastructure/persistence/DatabaseConfiguration.java` y `EnvironmentDatabaseConfiguration.java` representan configuraciÃ³n JDBC externa; los adaptadores no pueden abrir conexiÃ³n hasta declarar el controlador y configurar el entorno.

El contrato `JwtConfiguration` aÃºn no completa PB-01. La infraestructura JDBC existe en el cÃ³digo, pero no acredita persistencia operativa.
### Riesgos revisados

- **PB-02:** la sesiÃ³n actual es un token opaco cuyo estado vive en el mapa `sessions` del servidor; `/api/auth/logout` lo elimina al recibir la solicitud. Si el servidor no responde, el frontend retira el token local y abandona la vista protegida, pero la entrada remota puede permanecer hasta expirar. Para usar JWT y ofrecer revocaciÃ³n inmediata se necesitarÃ­a conservar estado de sesiÃ³n/revocaciÃ³n en servidor (por ejemplo, identificar cada sesiÃ³n y poder invalidarla); borrar solo el JWT del navegador no basta.
- **PB-03:** `ArchivoUsuarios` y `ArchivoProfesionales` escriben archivos temporales y usan movimiento atÃ³mico cuando estÃ¡ disponible. La sincronizaciÃ³n Java es por instancia y no cubre una transacciÃ³n que abarque ambos archivos; operaciones que actualizan cuenta y ficha pueden dejar estados divergentes si falla una escritura intermedia. La soluciÃ³n completa corresponde a una transacciÃ³n en el adaptador PostgreSQL una vez definidos conexiÃ³n y migraciones.

### Addendum de implementaciÃ³n del 2026-10-15

El cÃ³digo posterior a esta revisiÃ³n aÃ±adiÃ³ entidades, casos de uso, adaptadores JDBC, esquema PostgreSQL borrador, rutas de pacientes/antecedentes/permisos y conexiÃ³n del frontend con la API. El detalle y el estado PB-01 a PB-08 actuales estÃ¡n en `implementation-status.md`, que prevalece donde esta revisiÃ³n histÃ³rica diga que esos componentes no existÃ­an.

## RevisiÃ³n tÃ©cnica previa a desbloqueo â€” 2026-10-15

La nueva inspecciÃ³n fue estÃ¡tica. No se ejecutaron pruebas, compilaciones, servidores ni migraciones, y no se inspeccionÃ³ `backend/data/`. El estado por PB de la secciÃ³n anterior sigue siendo parcial; la presencia de las rutas y adaptadores no acredita funcionamiento operativo.

- La aplicaciÃ³n no declara un sistema de construcciÃ³n backend ni release de Java. No existe actualmente una instrucciÃ³n reproducible del backend en la documentaciÃ³n inspeccionada. La recomendaciÃ³n de Maven + Java 17 estÃ¡ pendiente de aprobaciÃ³n.
- `JwtConfiguration` es un contrato sin implementaciÃ³n. La sesiÃ³n real sigue siendo opaca y en memoria; algoritmo, vida de acceso y revocaciÃ³n estÃ¡n pendientes.
- Permisos faltantes se deniegan. No existe matriz inicial ni mecanismo de bootstrap, por lo que los endpoints protegidos por permisos requieren una configuraciÃ³n externa explÃ­cita antes de poder administrarlos.
- PostgreSQL es el destino que el cÃ³digo JDBC espera, pero no se encontrÃ³ driver declarado ni esquema aplicado; no se verificÃ³ conexiÃ³n. El archivo SQL sigue siendo borrador.
- El acceso de profesionales a pacientes se deniega hasta contar con polÃ­tica y verificaciÃ³n de asignaciones en backend.
- Propuestas concretas y decisiones que requieren aprobaciÃ³n: `technical-decisions-proposal.md`.

No considerar el Sprint 1 listo hasta aprobar las decisiones, implementar los bloqueos indicados y obtener evidencia futura de las pruebas de aceptaciÃ³n.

## Avance tras aprobaciÃ³n tÃ©cnica â€” 2026-10-15

El usuario aprobÃ³ Java 17/Maven, PostgreSQL/JDBC, Flyway explÃ­cito, JWT HS256 de 15 minutos, revocaciÃ³n server-side, asignaciÃ³n de un profesional responsable por paciente, default-deny, bootstrap externo de una ejecuciÃ³n, manejo separado de pacientes inactivos, normalizaciÃ³n documental conservadora y conservaciÃ³n de historia y asignaciones finalizadas. La matriz exacta de permisos sigue pendiente y no se inventÃ³ ni se inicializÃ³.

En cÃ³digo se aÃ±adieron el descriptor Maven, configuraciÃ³n y servicio JWT, repositorio persistente de sesiones, bootstrap CLI sujeto a un hash de matriz aprobado, modelo y protecciÃ³n backend de asignaciones, lista histÃ³rica protegida, bloqueos de escritura sobre inactivos y una migraciÃ³n Flyway V1. La dependencia Flyway es 12.6.0 para el baseline Java 17; no se resolviÃ³ ni instalÃ³. `V1` no se aplicÃ³ y el backend/data no se inspeccionÃ³.

El acceso sin decisiones de permiso continÃºa denegado. La inicializaciÃ³n del bootstrap no se ejecutÃ³; requiere matriz aprobada, hash de aprobaciÃ³n y una cuenta administradora existente. Variables externas DB/JWT/bootstrap no estÃ¡n configuradas por esta tarea. Usuarios y profesionales permanecen en TXT; asignaciones usan correo normalizado y requieren una identidad estable futura para una migraciÃ³n duradera.

Estado PB-01 a PB-08: PB-04 bloqueado por matriz pendiente; los demÃ¡s parciales por dependencias, migraciÃ³n, configuraciÃ³n externa o verificaciones de ejecuciÃ³n. Ver la secciÃ³n mÃ¡s reciente de `implementation-status.md` para evidencia y brechas por PB. Esta entrega no ejecutÃ³ pruebas, compilaciones, servidores ni migraciones.

La persistencia no estÃ¡ verificada ni disponible para considerarla operativa: no existe descriptor de construcciÃ³n backend, controlador JDBC declarado, configuraciÃ³n de conexiÃ³n confirmada ni esquema aplicado. No se ejecutaron pruebas ni migraciones. Los permisos no tienen valores predeterminados; ademÃ¡s de ser administrador, `/api/permisos` requiere decisiones efectivas `PERMISOS/READ` y `PERMISOS/UPDATE`, por lo que se requiere un mecanismo de bootstrap aprobado antes de poder configurar permisos desde la API. Las rutas de antecedentes requieren ademÃ¡s permiso del mÃ³dulo del paciente asociado; los profesionales siguen denegados hasta definir asignaciones.

> **Nota de vigencia (2026-10-16):** este informe documenta una revisiÃ³n anterior de Sprint 1. Las conclusiones y pendientes de esa fecha son histÃ³ricas. Para el estado actual consulta [implementation-status.md](implementation-status.md) y la [guÃ­a principal](../../README.md); usuarios y profesionales ya estÃ¡n en PostgreSQL y los TXT locales fueron retirados.
