# Sprint 3 — Banco de Ejercicios, Rutinas y Contraindicaciones Clínicas

**Estado:** **Completado** (`PB-10` a `PB-19`)  
**Actualizado:** 2026-11-15

---

## Sprint Goal

Proveer un catálogo geriátrico estructurado por categorías y un módulo seguro de prescripción de rutinas personalizadas que alerte y bloquee contraindicaciones frente a los antecedentes del paciente, permitiendo ajustar o historiar cada rutina según su evolución.

---

## Historias de usuario incluidas

| ID | Historia | Implementación Backend + Frontend | Archivos clave |
| :--- | :--- | :--- | :--- |
| **PB-10** | Consultar banco de ejercicios | Esquema `catalogo_ejercicios` (`V6`) con 41 ejercicios iniciales + endpoint `GET /api/ejercicios/catalogo` + grilla de tarjetas en UI. | [V6__exercise_catalog_and_clinical_alerts.sql](../../../backend/migrations/V6__exercise_catalog_and_clinical_alerts.sql), [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-11** | Registrar nuevos ejercicios | Formulario de alta conectado a `POST /api/ejercicios/catalogo` con generación de slug único, categoría, guía técnica y restricciones clínicas opcionales. | [SeniorManageApiServer.java](../../../backend/src/presentation/SeniorManageApiServer.java), [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-12** | Modificar información de un ejercicio del catálogo | Endpoint `PUT /api/ejercicios/catalogo/{id}` + botón *Editar* en cada tarjeta del catálogo para actualizar nombre, categoría, descripción y contraindicaciones. | [SeniorManageApiServer.java](../../../backend/src/presentation/SeniorManageApiServer.java), [managementApi.ts](../../../frontend/infrastructure/managementApi.ts), [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-13** | Organizar ejercicios por categorías | Chips interactivos por categoría con contador (*Movilidad*, *Fuerza*, *Equilibrio*, *Resistencia*, *Flexibilidad*, *Respiración*, *Coordinación*), buscador de texto en catálogo y filtro rápido por categoría al prescribir. | [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-14** | Crear una rutina personalizada para un paciente | Prescripción personalizada en `planes_ejercicios` agrupada por paciente tratante, con creación y vista consolidada por adulto mayor. | [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-15** | Agregar ejercicios a una rutina | Adición continua de ejercicios (`POST /api/ejercicios/planes`) manteniendo seleccionado el paciente y acción rápida *+ Agregar ejercicio a su rutina*. | [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-16** | Configurar parámetros de cada ejercicio | Campos validados para `frequency` (1–120 chars), `sets` (1–20), `repetitions` (1–200), `durationMinutes` (1–240) y `notes` (hasta 2000 chars). | [SeniorManageApiServer.java](../../../backend/src/presentation/SeniorManageApiServer.java), [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-17** | Modificar una rutina existente según evolución | Endpoint `PUT /api/ejercicios/planes/{id}` + acciones *Modificar parámetros*, *Finalizar en rutina* y *Reactivar en rutina* con validación clínica al reactivar o modificar. | [SeniorManageApiServer.java](../../../backend/src/presentation/SeniorManageApiServer.java), [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-18** | Consultar rutinas de un paciente (actual e histórica) | `GET /api/ejercicios/planes` retorna planes activos e históricos con `active: boolean`; la UI permite filtrar por paciente y alternar entre *Rutinas activas*, *Historial* y *Todas*. | [SeniorManageApiServer.java](../../../backend/src/presentation/SeniorManageApiServer.java), [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-19** | Alerta ante contraindicación registrada para el paciente | `GET /api/ejercicios/catalogo/{patientId}` normaliza tildes/mayúsculas contra `antecedentes` y marca `blocked: true` + `alerts[]`; el selector deshabilita el ejercicio, muestra advertencia explícita y el servidor rechaza con HTTP `409` cualquier asignación o reactivación contraindicada. | [SeniorManageApiServer.java](../../../backend/src/presentation/SeniorManageApiServer.java), [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |

---

## Verificación del incremento

- Compilación Java 17 (`mvn -f backend/pom.xml -o test-compile`): **BUILD SUCCESS** (46 clases principales + 3 pruebas).
- Pruebas unitarias (`PruebaLogin`): **14 casos/verificaciones correctos**.
- Validación TypeScript (`npm --prefix frontend run typecheck`): **pasó sin errores (`0`)**.
