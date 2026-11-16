# Migraciones de PostgreSQL (Flyway)

Las migraciones SQL versionadas construyen y evolucionan el esquema de PostgreSQL requerido por la API. En ejecución local manual, la API no modifica el esquema automáticamente al arrancar; en despliegue contenerizado, `ContainerBootstrap` aplica las migraciones pendientes antes de iniciar el servidor.

## Ejecución manual de migraciones

Exporta `SENIOR_MANAGE_JDBC_URL`, `SENIOR_MANAGE_DB_USERNAME` y `SENIOR_MANAGE_DB_PASSWORD` en tu terminal y ejecuta desde la raíz del repositorio:

```bash
mvn -f backend/pom.xml -Dsenior.manage.mainClass=infrastructure.migrations.ApplyMigrations exec:java
```

## Inventario de migraciones (`V1` a `V6`)

| Versión | Archivo | Qué incorpora al esquema |
| :--- | :--- | :--- |
| **V1** | [V1__sprint1_patients_permissions.sql](V1__sprint1_patients_permissions.sql) | Tablas base `pacientes`, `antecedentes`, `permisos_rol`, `sesiones`, `permission_bootstrap_state` y `asignaciones_profesional_paciente`. |
| **V2** | [V2__identity_storage_and_legacy_import.sql](V2__identity_storage_and_legacy_import.sql) | Tablas `usuarios`, `profesionales`, enlace estable `profesional_id` en asignaciones y registro de importación histórica (`legacy_text_import`). |
| **V3** | [V3__appointments_and_medication_notes.sql](V3__appointments_and_medication_notes.sql) | Tablas `citas` (con estado `PROGRAMADA`/`COMPLETADA`/`CANCELADA`) y `seguimientos_medicamentos`. |
| **V4** | [V4__exercise_followups.sql](V4__exercise_followups.sql) | Tabla `seguimientos_ejercicios` para registro histórico de actividades realizadas. |
| **V5** | [V5__professional_profiles_and_verification.sql](V5__professional_profiles_and_verification.sql) | Campos extendidos de ficha en `profesionales` (`especialidad`, `registro_profesional`, `formacion`, `experiencia`, `biografia`) y flujo de verificación administrativa (`estado_verificacion`, `nota_revision`, `verificado_por`, `verificado_en`). |
| **V6** | [V6__exercise_catalog_and_clinical_alerts.sql](V6__exercise_catalog_and_clinical_alerts.sql) | Tabla `catalogo_ejercicios` (con 41 ejercicios semilla en 7 categorías y arreglo `restricciones_clinicas`), vínculo opcional en `seguimientos_ejercicios` y tabla `planes_ejercicios` para rutinas personalizadas activas e históricas. |

Después de aplicar migraciones en una base limpia o actualizada, ejecuta el bootstrap de permisos descrito en [backend/README.md](../README.md).
