# Documentación de Senior-Manage

Esta carpeta reúne la guía funcional y técnica vigente. El código y las migraciones son la fuente de verdad cuando un documento histórico de sprint describe una versión anterior.

## Para empezar

1. Lee el [README principal](../README.md) para requisitos y arranque local.
2. Configura base de datos, Java y seguridad según la [guía del backend](../backend/README.md).
3. Aplica las [migraciones PostgreSQL](../backend/migrations/README.md) y el bootstrap de permisos aprobado.
4. Consulta los [endpoints de la API](api/README.md) y la [arquitectura](architecture/ARCHITECTURE.md).

## Documentos

- `architecture/ARCHITECTURE.md`: capas, dependencias y componentes.
- `api/README.md`: autenticación, permisos y rutas HTTP relevantes.
- `requirements/README.md`: alcance funcional.
- `sprints/`: decisiones, alcance y evidencia por sprint. Los documentos de sprint reflejan el momento en que se escribieron; revisa la fecha y contrástalos con el código actual antes de usarlos como guía operativa.
- `database/` y `backend/migrations/`: esquema, scripts y evolución de PostgreSQL.

## Persistencia

El proyecto comenzó con almacenamiento local de usuarios y profesionales en archivos TXT. Esa persistencia fue reemplazada por PostgreSQL y dejó de ser usada por el backend. Los archivos de datos y las implementaciones TXT ya no forman parte del proyecto. La herramienta de importación fue puntual y se retiró después de migrar; no interviene en el arranque de la API.

La base PostgreSQL no se guarda en este repositorio. La URL JDBC externa define el host, puerto y base lógica; el servidor PostgreSQL configura la ubicación física de sus archivos (`SHOW data_directory;`).

## Estado actual

El backend usa Java 17, JDBC y Flyway; el frontend usa React, TypeScript y Vite. V1–V5 crean el esquema y la matriz de permisos se aplica por un comando operativo explícito. Las cuentas profesionales pueden completar su ficha y el administrador puede editar todos esos datos y decidir su verificación. El selector de tema se guarda localmente en el navegador.

