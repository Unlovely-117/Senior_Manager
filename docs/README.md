# Documentación de Senior-Manage

Esta carpeta centraliza la documentación funcional, técnica y de seguimiento de sprints vigente hasta el **Sprint 3** (`PB-01` a `PB-19`, `PB-25` y `PB-26`), junto con la infraestructura contenerizada lista para despliegue.

---

## Guía de inicio

1. Lee el [README principal](../README.md) para elegir entre arranque con Docker Compose o desarrollo local.
2. Configura base de datos, variables de entorno y bootstrap según la [guía del backend](../backend/README.md).
3. Revisa las [migraciones PostgreSQL V1–V6](../backend/migrations/README.md).
4. Consulta la [especificación de la API](api/README.md) y la [arquitectura del sistema](architecture/ARCHITECTURE.md).

---

## Índice de documentos

| Documento | Contenido |
| :--- | :--- |
| [sprints/README.md](sprints/README.md) | Tablero consolidado del Product Backlog (`PB-01`–`PB-37`) y estado por Sprint (1 al 5). |
| [sprints/sprint-1/implementation-status.md](sprints/sprint-1/implementation-status.md) | Estado y cierre técnico del Sprint 1 (autenticación, usuarios, roles, permisos y seguridad). |
| [sprints/sprint-2/README.md](sprints/sprint-2/README.md) | Entrega del Sprint 2 (pacientes, antecedentes clínicos, historial de evolución y dashboard profesional). |
| [sprints/sprint-3/README.md](sprints/sprint-3/README.md) | Entrega del Sprint 3 (banco de ejercicios por categorías, rutinas personalizadas y alertas clínicas). |
| [sprints/sprint-4/README.md](sprints/sprint-4/README.md) | Alcance pendiente del Sprint 4 y adelantos ya implementados en citas médicas. |
| [api/README.md](api/README.md) | Contrato completo de rutas HTTP `/api`, autenticación, permisos y códigos de respuesta. |
| [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Arquitectura por capas, modelo de datos PostgreSQL (`V1–V6`), seguridad y despliegue Docker/Caddy. |
| [requirements/README.md](requirements/README.md) | Requisitos funcionales y no funcionales actualizados hasta el Sprint 3. |
| [REVISION_SEGURIDAD_Y_DESPLIEGUE_VERCEL.md](REVISION_SEGURIDAD_Y_DESPLIEGUE_VERCEL.md) | Auditoría de seguridad, remediaciones aplicadas y guía de despliegue en VPS / Vercel. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Flujo de ramas Git, formato de commits y lista de verificación para Pull Requests. |

> **Nota sobre documentos históricos:** dentro de [sprints/sprint-1/](sprints/sprint-1/) se conservan propuestas y actas tempranas (`README.md`, `technical-decisions-proposal.md`, etc.) redactadas antes de completar la migración a PostgreSQL y Docker. Prevalece siempre lo documentado en este índice y en el código vigente.
