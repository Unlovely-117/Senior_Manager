# Arquitectura del Sistema — Senior-Manage

## 1. Propósito
Definir la arquitectura base de Senior-Manage, plataforma para apoyar la gestión de terapia física y cuidado de adultos mayores, manteniendo los archivos separados por capas y responsabilidades.

## 2. Alcance y actores
La plataforma es utilizada únicamente por dos roles: **Administrador** y **Profesional** (fisioterapeutas y cuidadores). Los pacientes son sujetos de atención y sus datos se gestionan en el sistema, pero no acceden directamente a la aplicación.

## 3. Estilo arquitectónico
Se adopta una arquitectura cliente-servidor desacoplada, con frontend y backend en proyectos/carpetas independientes. El backend será un monolito modular organizado estrictamente por capas. El frontend también separará presentación, lógica de aplicación, acceso a API y modelos compartidos.

No se adopta microservicios para el alcance inicial. Los módulos funcionales viven dentro de una sola aplicación backend, pero las responsabilidades y dependencias estarán separadas por capas.

## 4. Estructura de carpetas propuesta

La estructura inicial del repositorio debe seguir esta organización. Los nombres de tecnologías y archivos específicos se ajustarán cuando el equipo confirme los frameworks.

```text
Senior_Manager/
├── README.md
├── docs/
│   ├── architecture/
│   │   └── ARCHITECTURE.md
│   ├── requirements/
│   ├── api/
│   └── sprints/
│       ├── sprint-1/
│       ├── sprint-2/
│       ├── sprint-3/
│       └── sprint-4/
├── frontend/
│   ├── presentation/       # Páginas, vistas, componentes y estilos
│   ├── application/        # Casos de uso, control de estado y coordinación
│   ├── infrastructure/     # Cliente HTTP, adaptadores y almacenamiento local permitido
│   ├── domain/             # Entidades y reglas/modelos de dominio del cliente
│   └── tests/
├── backend/
│   ├── src/
│   │   ├── presentation/   # Rutas/controladores, DTO, validación HTTP
│   │   ├── application/    # Casos de uso, servicios de aplicación y contratos
│   │   ├── domain/         # Entidades, reglas de negocio e interfaces del dominio
│   │   ├── infrastructure/ # Repositorios concretos, ORM, persistencia y servicios externos
│   │   └── shared/         # Excepciones, utilidades y componentes transversales
│   ├── migrations/
│   └── tests/
└── database/
    ├── scripts/
    ├── seeds/
    └── diagrams/
```

## 5. Responsabilidades de las capas

### 5.1 Frontend
- **presentation:** componentes visuales, páginas, formularios, navegación y estilos. No contiene reglas de negocio ni consultas directas a la base de datos.
- **application:** coordina acciones de usuario y casos de uso del cliente; administra estados y transforma datos para las vistas.
- **domain:** modelos y reglas simples propias del dominio que el cliente necesite representar. No depende de la infraestructura.
- **infrastructure:** implementación del cliente HTTP, manejo de tokens/sesión según la estrategia definida y adaptadores para consumir la API.

### 5.2 Backend
- **presentation:** recibe solicitudes HTTP, aplica validación de entrada y autenticación/autorización de la petición, invoca casos de uso y construye respuestas. Los controladores deben ser delgados.
- **application:** contiene los casos de uso y coordina el flujo de la operación. Define puertos/contratos que requiere del dominio o infraestructura.
- **domain:** contiene entidades, objetos de valor, invariantes y reglas de negocio. No depende de frameworks, HTTP, ORM ni base de datos.
- **infrastructure:** implementa repositorios, acceso a base de datos, ORM, correo, archivos u otros servicios externos. Depende de contratos definidos hacia adentro.
- **shared:** elementos transversales estrictamente reutilizables, evitando convertir esta carpeta en un depósito de lógica de negocio.

### 5.3 Base de datos
La carpeta `database/` contiene documentación, scripts de apoyo y datos semilla no sensibles. Las migraciones ejecutables pertenecen a `backend/migrations/` para mantener el versionado del esquema junto al backend. El motor de base de datos se definirá como decisión técnica del equipo.

## 6. Regla de dependencias entre capas
Las dependencias deben apuntar hacia adentro:

```text
Frontend: presentation → application → domain
                              ↓
                       infrastructure (implementa adaptadores/contratos)

Backend: presentation → application → domain
                              ↑
                    infrastructure implementa contratos
```

- El dominio no importa ni conoce controladores, frameworks, ORM ni detalles de persistencia.
- La capa de presentación no accede directamente a repositorios ni a la base de datos.
- Los casos de uso dependen de interfaces/contratos, no de implementaciones concretas.
- La infraestructura implementa los contratos definidos por las capas internas.
- Ninguna pantalla, controlador o módulo debe concentrar todas las responsabilidades en un solo archivo.

## 7. Módulos funcionales del backend
Dentro de las capas anteriores, organizar los archivos por módulo funcional cuando el proyecto crezca, conservando la separación de capas. Los módulos iniciales previstos son:
- identidad, autenticación y autorización;
- usuarios y roles;
- pacientes;
- profesionales;
- terapias y planes de atención;
- sesiones y agenda;
- seguimiento y evolución;
- reportes;
- auditoría.

Cada módulo debe separar sus entidades/reglas, casos de uso, controladores/DTO y repositorios/adaptadores en la capa correspondiente. El alcance definitivo se refina con el Product Backlog.

## 8. Seguridad
- Autenticación obligatoria para Administrador y Profesional.
- La autorización por rol y permiso se valida en el backend; ocultar controles en frontend no reemplaza la autorización.
- Validar entradas en la API y usar consultas parametrizadas/ORM seguro.
- Usar HTTPS en entornos desplegados y no almacenar contraseñas en texto plano; emplear hash robusto con salt mediante una biblioteca reconocida.
- Proteger datos personales y de salud con mínimo privilegio, registro de acciones relevantes y secretos en variables de entorno o un gestor de secretos.
- No incluir datos reales de pacientes en pruebas, repositorio, logs ni seeds.

## 9. Despliegue lógico
Navegador → frontend → API REST/backend por capas → base de datos. La base de datos no se expone directamente al navegador. Frontend y backend pueden desplegarse por separado, aunque el backend se entrega inicialmente como una sola aplicación.

## 10. Decisiones pendientes
El equipo debe confirmar framework/lenguaje de frontend y backend, motor de base de datos, proveedor de despliegue, estrategia concreta de autenticación, política de respaldos y herramienta de documentación de API. La estructura por capas no obliga a una tecnología específica.

## 11. Entrega por etapas
La implementación se organiza en cuatro sprints. Cada sprint debe producir un incremento integrado, probado y demostrable, respetando la estructura por capas y los criterios de aceptación acordados por el equipo.
