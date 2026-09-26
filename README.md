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

## Trabajo por sprints
La planificación se mantiene en [docs/sprints/](docs/sprints/), con una carpeta por cada uno de los cuatro sprints. Cada sprint debe registrar objetivo, historias seleccionadas, tareas por capa, criterios de aceptación, pruebas y evidencia del incremento.
