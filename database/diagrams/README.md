# Diagramas de base de datos

El esquema PostgreSQL vigente se define en las migraciones Flyway desde [V1__sprint1_patients_permissions.sql](../../backend/migrations/V1__sprint1_patients_permissions.sql) hasta [V6__exercise_catalog_and_clinical_alerts.sql](../../backend/migrations/V6__exercise_catalog_and_clinical_alerts.sql). Revisa esas migraciones antes de actualizar o generar diagramas ER.

Los datos residen únicamente en el servidor PostgreSQL configurado mediante `SENIOR_MANAGE_JDBC_URL`; el repositorio versiona migraciones SQL, no archivos de datos.
