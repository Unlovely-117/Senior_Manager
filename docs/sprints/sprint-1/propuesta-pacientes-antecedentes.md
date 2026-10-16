# Propuesta pendiente: pacientes y antecedentes

Este documento registra una propuesta de diseño para PB-05 a PB-08. No define un modelo clínico aprobado ni habilita persistencia. Antes de implementar entidades, reglas de validación, endpoints o migraciones, deben aprobarse los puntos marcados como pendientes.

## Entidades propuestas

### Paciente

Campos iniciales considerados por PB-05 y PB-06:

- Identificador interno estable (tipo por decidir).
- Nombres y apellidos.
- Documento de identidad y una representación normalizada para aplicar unicidad.
- Fecha de nacimiento.
- Teléfono.
- Dirección.
- Observaciones.
- Estado activo/inactivo para desactivación lógica.

PB-05 no determina cuáles campos son obligatorios ni las reglas de formato. Esas decisiones quedan pendientes. El documento debe ser único después de normalizarlo, pero el formato canónico, reglas por país y tratamiento de documentos históricos necesitan aprobación.

### Antecedente

Campos requeridos por PB-08:

- Identificador interno estable (tipo por decidir).
- Referencia al paciente propietario.
- Tipo.
- Descripción.
- Fecha.

Un paciente puede tener varios antecedentes. La eliminación queda fuera del alcance inicial; la actualización debe mantener la asociación con el paciente. El catálogo de tipos, los campos obligatorios y las reglas de edición necesitan aprobación.

## Asignación profesional-paciente

La regla funcional indica que un profesional solo puede consultar y gestionar pacientes asignados. El código actual no contiene una relación de asignación.

Propuesta para decidir: una entidad de asignación independiente con referencias a paciente y profesional, estado y fechas de vigencia. Debe definirse si un paciente puede tener uno o varios profesionales simultáneamente, cómo se asigna y revoca una relación, y qué operaciones permite cada rol. No se implementa ni se simula esa relación en esta fase.

La autorización debe verificarse en el servidor y restringirse también en las consultas del repositorio. Un filtro de frontend no es un control de acceso.

## Persistencia propuesta

El Sprint Backlog identifica PostgreSQL como objetivo del trabajo actual, pero la configuración del repositorio no contiene un controlador, una conexión, un sistema de migraciones ni una estrategia comprobable. Antes de codificar un adaptador o una migración reproducible, faltan la aprobación de la dependencia JDBC, el mecanismo de configuración de conexión, la herramienta de migración y la estrategia de claves/secrets para el entorno.

El esquema futuro deberá asegurar unicidad del documento normalizado, relación uno-a-muchos entre paciente y antecedente y retención de antecedentes al desactivar pacientes. Las restricciones exactas dependen de las decisiones anteriores.

## Decisiones que bloquean implementación

1. Campos obligatorios y validaciones de paciente.
2. Normalización del documento y tratamiento de documentos por jurisdicción.
3. Catálogo y campos obligatorios de antecedentes.
4. Cardinalidad, vigencia y ciclo de vida de asignaciones profesional-paciente.
5. Permisos por rol, módulo y operación, incluidos pacientes y antecedentes inactivos.
6. Política de acceso histórico, reactivación y edición de pacientes inactivos.
7. Dependencia JDBC, configuración segura y herramienta/convención para migraciones PostgreSQL.

No se deben tratar registros de demostración del frontend como datos persistidos reales. La interfaz de pacientes debe conectarse a la API real antes de retirar el prototipo.

## Contrato neutral de permisos

`domain/entities/Permiso.java` representa una decisión para un par módulo/operación y `domain/RepositorioPermisos.java` define lectura y reemplazo de la configuración de un rol. Los nombres se conservan como texto para no cerrar la matriz aún pendiente. No hay adaptador ni servicio que use el contrato; antes de conectarlo se deben definir catálogo de módulos/operaciones, comportamiento ante configuración ausente y validación contra autoelevación o bloqueo del último administrador.