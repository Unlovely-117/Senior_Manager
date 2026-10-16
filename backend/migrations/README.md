# Migraciones

Las migraciones versionadas crean el esquema de PostgreSQL requerido por la API. La API no las aplica automaticamente.

Configura `SENIOR_MANAGE_JDBC_URL`, `SENIOR_MANAGE_DB_USERNAME` y `SENIOR_MANAGE_DB_PASSWORD` en la terminal local y, desde la raiz del repositorio, ejecuta:

```powershell
mvn -f backend/pom.xml "-Dsenior.manage.mainClass=infrastructure.migrations.ApplyMigrations" exec:java
```

El comando aplica V1, V2, V3, V4 y V5 mediante Flyway. V3 agrega citas, V4 agrega seguimiento de ejercicios y V5 agrega los datos extendidos de la ficha profesional y su flujo de verificacion administrativa. V5 conserva las fichas existentes como `SIN_PRESENTAR` para que cada profesional complete sus credenciales y las envie a revision. Luego ejecuta el bootstrap de permisos descrito en `backend/README.md`; la API inicia solo cuando PostgreSQL, todas las migraciones y la matriz aprobada estan disponibles.
