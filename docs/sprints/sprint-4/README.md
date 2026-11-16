# Sprint 4 — Sesiones Clínicas, Seguimiento y Cuidado Diario (Planificado)

**Estado:** **Parcial / Pendiente** (`PB-20`–`PB-24`, `PB-31`–`PB-33`)  
**Actualizado:** 2026-11-15

---

## Base ya disponible en el repositorio

- **Gestión base de citas (`PB-20`, `PB-21` parciales):** existen la tabla `citas` (`V3`), endpoints `/api/citas` (`GET`, `POST`, `PUT`, `DELETE`) y la pantalla [AdminAppointmentsPage.tsx](../../../frontend/presentation/pages/AdminAppointmentsPage.tsx) que permiten programar, listar, completar o cancelar citas vinculadas a paciente y profesional asignado.
- **Tablas preparatorias en esquema (`V3`, `V4`):** existen `seguimientos_medicamentos` y `seguimientos_ejercicios` para futuras extensiones.

---

## Alcance pendiente para completar Sprint 4

| ID | Épica | Historia | Brecha actual |
| :--- | :--- | :--- | :--- |
| **PB-20** | Sesiones | Programar una sesión con un paciente | Vincular sesiones estructuradas opcionalmente con una rutina activa del paciente. |
| **PB-21** | Sesiones | Consultar sesiones programadas | Agregar filtros por fecha/rango/estado y calendario operativo para el profesional. |
| **PB-22** | Sesiones | Registrar la realización de una sesión | Registrar ejecución de cada ejercicio de la rutina en una sesión con observaciones de cierre. |
| **PB-23** | Seguimiento | Registrar métricas de una sesión | Capturar métricas cuantitativas de esfuerzo, movilidad, dolor o cumplimiento por sesión. |
| **PB-24** | Seguimiento | Consultar historial de sesiones | Vista dedicada de evolución cronológica de sesiones realizadas y métricas por paciente. |
| **PB-31** | Cuidado Diario | Registrar signos vitales del paciente | Nueva tabla/migración, API y formulario diario (presión, pulso, temperatura, saturación, notas). |
| **PB-32** | Cuidado Diario | Registrar administración de medicamentos | Habilitar permisos, endpoints e interfaz para registrar tomas sobre `seguimientos_medicamentos` o esquema ampliado. |
| **PB-33** | Cuidado Diario | Registrar bitácora de turnos y cuidados | Modelo, API e interfaz para notas de cambio de turno y novedades diarias de cuidado. |
