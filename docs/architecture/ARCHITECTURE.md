# Arquitectura del Sistema — Senior-Manage

## 1. Propósito
Definir la arquitectura base de Senior-Manage, plataforma para apoyar la gestión de terapia física y cuidado de adultos mayores.

## 2. Alcance y actores
La plataforma es utilizada únicamente por dos roles: **Administrador** y **Profesional** (fisioterapeutas y cuidadores). Los pacientes son sujetos de atención y sus datos se gestionan en el sistema, pero no acceden directamente a la aplicación.

## 3. Estilo arquitectónico
Se adopta una arquitectura cliente-servidor desacoplada, con API REST y backend organizado como monolito modular. El frontend consume la API mediante HTTP/HTTPS. El backend se despliega como una aplicación y centraliza las reglas de negocio y el acceso a datos.

No se adopta microservicios para el alcance inicial: los módulos se mantienen separados por responsabilidad dentro de una única aplicación backend.

## 4. Vista lógica
- **Frontend:** interfaz web para Administrador y Profesional; navegación, formularios, validaciones de experiencia de usuario y consumo de API.
- **API REST:** punto de entrada para autenticación, autorización y operaciones del sistema.
- **Backend modular:** módulos de identidad y acceso, usuarios/roles, pacientes, profesionales, terapias y sesiones, agenda, seguimiento/evolución, reportes y auditoría, sujetos a refinamiento del Product Backlog.
- **Persistencia:** base de datos relacional centralizada, con acceso exclusivo desde el backend. El motor se definirá como decisión técnica del equipo.

## 5. Reglas de seguridad
- Autenticación obligatoria para Administrador y Profesional.
- Autorización por rol y validación de permisos en el backend; ocultar controles en frontend no reemplaza autorización.
- Validación de datos en API y consultas parametrizadas/ORM seguro.
- Usar HTTPS en entornos desplegados y no almacenar contraseñas en texto plano; emplear hash robusto con salt.
- Proteger datos personales y de salud con mínimo privilegio, registro de acciones relevantes y manejo cuidadoso de secretos mediante variables de entorno.

## 6. Principios de diseño
- Separación de responsabilidades y cohesión por módulo.
- Contratos de API documentados y versionables.
- Validación consistente y respuestas de error controladas.
- Pruebas unitarias para reglas de negocio y pruebas de integración para API y persistencia.
- Migraciones versionadas y datos de prueba no sensibles.

## 7. Despliegue lógico
Navegador del usuario → aplicación frontend → API REST/backend modular → base de datos. La base de datos no se expone directamente al navegador.

## 8. Decisiones pendientes
El equipo debe confirmar framework/lenguaje de frontend y backend, motor de base de datos, proveedor de despliegue, estrategia concreta de autenticación, política de respaldos y herramienta de documentación de API. No se fijan tecnologías que aún no hayan sido acordadas.

## 9. Entrega por etapas
La implementación se organiza en cuatro sprints. Cada sprint debe producir un incremento integrado, probado y demostrable, de acuerdo con el Sprint Goal y los criterios de aceptación acordados por el equipo.
