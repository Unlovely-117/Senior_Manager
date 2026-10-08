# Senior-Manage

Espacio central de trabajo para planificar, ejecutar y hacer seguimiento del desarrollo de Senior-Manage durante cuatro sprints.

## Descripción
Senior-Manage es una plataforma para apoyar la gestión de terapia física y cuidado de adultos mayores. Los únicos usuarios de la plataforma son el **Administrador** y el **Profesional** (fisioterapeutas/cuidadores). Los pacientes no ingresan directamente al sistema.

## Arquitectura
El proyecto utiliza una arquitectura cliente-servidor desacoplada:
- **Frontend** independiente que consume una API REST.
- **Backend** como monolito modular organizado por capas.
- **Base de datos** centralizada, accesible únicamente desde el backend.

La arquitectura y las reglas de dependencias se documentan en [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md).

## Estructura del repositorio

```text
Senior_Manager/
├── docs/
│   ├── architecture/       # Arquitectura y decisiones técnicas
│   ├── requirements/       # Requisitos funcionales y no funcionales
│   ├── api/                # Contratos y documentación REST
│   └── sprints/            # Planificación y evidencias de los 4 sprints
├── frontend/
│   ├── presentation/       # UI, vistas y componentes
│   ├── application/        # Casos de uso y estado del cliente
│   ├── domain/             # Modelos y reglas del cliente
│   ├── infrastructure/     # Cliente HTTP y adaptadores
│   └── tests/
├── backend/
│   ├── src/
│   │   ├── presentation/   # Rutas, controladores y DTO
│   │   ├── application/    # Casos de uso
│   │   ├── domain/         # Entidades y reglas de negocio
│   │   ├── infrastructure/ # Persistencia y adaptadores concretos
│   │   └── shared/         # Elementos técnicos transversales
│   ├── migrations/
│   └── tests/
└── database/
    ├── scripts/
    ├── seeds/              # Solo datos ficticios
    └── diagrams/
```

## Regla de separación por capas
1. La presentación no contiene lógica de negocio ni accede directamente a la base de datos.
2. Los casos de uso coordinan operaciones y dependen de contratos.
3. El dominio contiene las reglas e invariantes del negocio y no depende de frameworks, HTTP u ORM.
4. La infraestructura implementa los contratos de persistencia y servicios externos.
5. Las dependencias se dirigen hacia las capas internas; los controladores y componentes visuales deben mantenerse delgados.

## Tecnologías
Los frameworks, lenguajes, motor de base de datos y proveedor de despliegue se definirán mediante decisión explícita del equipo. No se debe agregar configuración dependiente de una tecnología antes de acordarla.

## Seguridad y datos
- Proteger los datos personales y de salud mediante mínimo privilegio y autorización en backend.
- No guardar contraseñas en texto plano ni incluir secretos en el repositorio.
- Usar exclusivamente datos ficticios en pruebas y seeds.
- No registrar información sensible de pacientes en logs.

## Roles y permisos

Senior-Manage implementará control de acceso basado en roles (RBAC), con dos roles iniciales: **Administrador** y **Profesional**. Los pacientes no tienen acceso directo a la plataforma.

### Administrador

Responsable de la gestión operativa y administrativa del centro. Sus permisos contemplan:

- **Usuarios y profesionales:** crear, consultar, editar, activar, desactivar y bloquear cuentas; administrar roles y permisos autorizados; iniciar procesos seguros de recuperación de acceso.
- **Pacientes:** registrar, consultar y actualizar datos personales y de contacto; gestionar estados (activo, inactivo, dado de alta); consultar la información clínica necesaria para la gestión autorizada.
- **Asignaciones:** asignar y reasignar pacientes a profesionales y gestionar autorizaciones temporales.
- **Agenda:** crear, consultar y modificar citas de todos los profesionales; cancelar o reprogramar sesiones y resolver conflictos de horarios.
- **Supervisión:** consultar sesiones, terapias, valoraciones y seguimientos para fines administrativos autorizados; revisar carga de trabajo, pendientes e indicadores generales.
- **Informes:** generar reportes globales de pacientes, sesiones, agendas y actividad del centro.
- **Configuración y auditoría:** gestionar parámetros del sistema y catálogos autorizados; consultar registros de auditoría.

El acceso administrativo a información clínica no implica permiso para alterar valoraciones o evoluciones firmadas como si fueran propias. Las correcciones clínicas deben conservar autoría, fecha, motivo e historial. El administrador no puede consultar contraseñas en texto plano.

### Profesional

Responsable de la atención y seguimiento de los pacientes que tiene asignados. Sus permisos contemplan:

- **Perfil:** consultar sus datos y actualizar la información de contacto permitida; cambiar su contraseña y consultar sus asignaciones y horarios.
- **Pacientes asignados:** consultar la información personal y clínica necesaria para la atención, antecedentes, restricciones y registros previos autorizados.
- **Agenda propia:** consultar sus citas, registrar la realización de sesiones y gestionar cambios o cancelaciones según las reglas del centro.
- **Atención clínica:** crear valoraciones iniciales y periódicas, registrar objetivos y planes terapéuticos dentro de su competencia, documentar ejercicios y procedimientos realizados y registrar observaciones de evolución.
- **Seguimiento e informes:** consultar el progreso de sus pacientes asignados y generar informes de evolución y estadísticas de sus propias sesiones.

El profesional no puede acceder a pacientes asignados exclusivamente a otros profesionales, salvo autorización expresa o asignación temporal vigente. No puede administrar usuarios, modificar la configuración global ni consultar auditorías globales.

### Matriz resumida de permisos

| Funcionalidad | Administrador | Profesional |
|---|---|---|
| Dashboard | Indicadores globales | Resumen personal |
| Usuarios | Crear, consultar, editar y desactivar | Consultar y actualizar perfil propio |
| Pacientes | Gestión global autorizada | Consultar y actualizar según autorización y asignación |
| Asignaciones | Crear y modificar | Consultar las propias |
| Agenda | Todas las agendas | Agenda propia |
| Terapias y sesiones | Supervisar globalmente | Registrar y gestionar sesiones propias |
| Valoraciones y evolución | Consultar para fines autorizados | Crear y consultar registros de pacientes asignados |
| Informes | Globales | De pacientes asignados y sesiones propias |
| Configuración | Gestionar | Sin acceso |
| Auditoría | Consultar registros autorizados | Sin acceso global |

### Permisos técnicos sugeridos

Los permisos deben validarse en el backend en cada endpoint y operación. Los siguientes identificadores son una propuesta inicial para los casos de uso y políticas de autorización:

| Módulo | Códigos sugeridos |
|---|---|
| Usuarios | `users.create`, `users.read`, `users.update`, `users.deactivate` |
| Pacientes | `patients.create`, `patients.read`, `patients.update`, `patients.assign` |
| Agenda | `appointments.create`, `appointments.read`, `appointments.update`, `appointments.cancel` |
| Terapias | `therapies.create`, `therapies.read`, `therapies.update` |
| Valoraciones | `assessments.create`, `assessments.read`, `assessments.update` |
| Evolución | `progress.create`, `progress.read`, `progress.correct` |
| Informes | `reports.global`, `reports.own`, `reports.export` |
| Auditoría | `audit.read` |
| Configuración | `settings.read`, `settings.update` |

El permiso de lectura o escritura debe combinarse con una comprobación de alcance: por ejemplo, que el paciente esté asignado al profesional autenticado o exista una autorización válida. Ocultar opciones en el frontend no reemplaza la autorización del backend.

### Reglas de negocio y seguridad

1. **Mínimo privilegio:** cada usuario solo accede a las funciones y datos necesarios para su rol y finalidad.
2. **Asignación obligatoria:** el profesional solo accede a pacientes asignados o expresamente autorizados.
3. **Autoría clínica:** cada valoración, sesión y evolución registra el usuario autor y las fechas correspondientes.
4. **Integridad:** los registros clínicos finalizados no se eliminan ni modifican silenciosamente. Las correcciones deben dejar trazabilidad.
5. **Desactivación:** al desactivar una cuenta se bloquea el inicio de sesión, pero se conserva la historia de sus registros.
6. **Auditoría:** registrar accesos y modificaciones sensibles, especialmente sobre información clínica.
7. **Privacidad:** limitar la consulta, exportación y divulgación de datos personales y de salud a finalidades autorizadas.

El desarrollo debe contemplar la normativa colombiana aplicable a datos personales sensibles y a la historia clínica, incluyendo la Ley 1581 de 2012 y las disposiciones que correspondan al servicio prestado.

## Menús por rol (referencia para el frontend)

**Administrador:** Dashboard, Usuarios, Pacientes, Asignaciones, Agendas, Terapias y seguimiento, Informes globales, Auditoría y Configuración.

**Profesional:** Mi dashboard, Mis pacientes, Mi agenda, Sesiones y valoraciones, Evolución e informes, Mi perfil.

La visibilidad de los menús es una medida de interfaz; la autorización efectiva siempre debe implementarse y comprobarse en el backend.

## Trabajo por sprints
La planificación se mantiene en [docs/sprints/](docs/sprints/), con una carpeta por cada uno de los cuatro sprints. Cada sprint debe registrar objetivo, historias seleccionadas, tareas por capa, criterios de aceptación, pruebas y evidencia del incremento.
