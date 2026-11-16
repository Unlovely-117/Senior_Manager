# Sprint 2 — Pacientes, Evolución Clínica y Dashboard Profesional

**Estado:** **Completado** (`PB-05`, `PB-06`, `PB-07`, `PB-08`, `PB-09`, `PB-25`)  
**Actualizado:** 2026-11-15

---

## Sprint Goal

Consolidar la gestión integral del expediente del adulto mayor (registro validado, consulta actual e histórica, actualización y antecedentes clínicos) conectándolo directamente con la planificación de ejercicios y un panel resumen operativo para el profesional tratante.

---

## Historias de usuario incluidas

| ID | Historia | Criterios y comportamiento implementado | Dónde verificarlo |
| :--- | :--- | :--- | :--- |
| **PB-05** | Registrar un paciente para almacenar su información | Validaciones en backend y frontend: nombre completo (3–120 chars), cédula numérica única (6–10 dígitos), fecha de nacimiento de adulto mayor (60–120 años, no futura) y teléfono (7–10 dígitos). Si registra un profesional, se auto-asigna automáticamente al paciente creado. | [SeniorManageApiServer.java](../../../backend/src/presentation/SeniorManageApiServer.java), [ElderlyPage.tsx](../../../frontend/presentation/pages/ElderlyPage.tsx) |
| **PB-06** | Consultar la información de un paciente | Listado activo (`GET /api/pacientes`), listado histórico de inactivos en solo lectura (`GET /api/pacientes/historicos`) y vista detallada en ficha. El profesional solo ve pacientes asignados activamente. | [ElderlyPage.tsx](../../../frontend/presentation/pages/ElderlyPage.tsx), [AdminAssignmentsPage.tsx](../../../frontend/presentation/pages/AdminAssignmentsPage.tsx) |
| **PB-07** | Actualizar la información de un paciente | Edición de datos personales del paciente activo (`PUT /api/pacientes/{id}`) y de antecedentes (`PUT /api/antecedentes/{id}`), respetando los permisos configurados (`PACIENTES/UPDATE`, `ANTECEDENTES/UPDATE`) y desactivación administrativa con retención de antecedentes (`PATCH /api/pacientes/{id}/estado`). | [ElderlyPage.tsx](../../../frontend/presentation/pages/ElderlyPage.tsx) |
| **PB-08** | Consultar antecedentes del paciente al planificar ejercicios | Al seleccionar un paciente en el constructor de rutinas, la interfaz consulta sus antecedentes clínicos (`GET /api/pacientes/{id}/antecedentes`) y los muestra junto al selector y a las alertas de contraindicación antes de prescribir. | [ExercisesPage.tsx](../../../frontend/presentation/pages/ExercisesPage.tsx) |
| **PB-09** | Visualizar el historial del paciente para consultar su evolución | Al abrir la ficha de un adulto mayor, además de sus antecedentes clínicos, se despliega la sección **Historial y evolución del paciente** con sus rutinas de ejercicio (activas e históricas), citas/sesiones y seguimientos de actividad. | [ElderlyPage.tsx](../../../frontend/presentation/pages/ElderlyPage.tsx) |
| **PB-25** | Visualizar resumen de pacientes, sesiones y rutinas en el dashboard | Panel principal profesional con 3 tarjetas KPI navegables (*Pacientes asignados*, *Sesiones programadas*, *Ejercicios en rutinas activas*) y listas resumen conectadas con *Adultos mayores*, *Agenda y citas* y *Ejercicios*. | [ProfessionalDashboardPage.tsx](../../../frontend/presentation/pages/ProfessionalDashboardPage.tsx), [AppRouter.tsx](../../../frontend/presentation/routes/AppRouter.tsx) |

---

## Verificación del incremento

- Compilación Java 17 y pruebas unitarias: `mvn -f backend/pom.xml -o test-compile` (`BUILD SUCCESS`) y `PruebaLogin` (`14 casos/verificaciones correctos.`).
- Validación de tipos TypeScript (`npm --prefix frontend run typecheck`): **pasó sin errores (`0`)**.
