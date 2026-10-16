# Requisitos funcionales y no funcionales

## Actores

- **Administrador:** mantiene cuentas y roles, profesionales y sus fichas, pacientes, antecedentes, asignaciones, citas, ejercicios y permisos habilitados para su rol.
- **Profesional:** completa su propia ficha y atiende únicamente pacientes con asignación activa; sus acciones sobre citas y ejercicios dependen de permisos.
- **Paciente:** no tiene cuenta de acceso al sistema.

## Requisitos funcionales

1. Autenticar cuentas activas y restringir rutas según rol y permisos efectivos en backend.
2. Permitir al administrador crear/editar cuentas y activar o desactivar usuarios.
3. Permitir crear y editar fichas profesionales con documento, contacto, especialidad, registro, formación, experiencia y presentación.
4. Permitir a profesionales enviar su ficha a revisión; dejar cada envío pendiente hasta decisión administrativa.
5. Permitir al administrador verificar la ficha o solicitar correcciones con una nota.
6. Gestionar datos de pacientes, antecedentes, asignaciones con historial, citas y seguimiento de ejercicios mediante la API y PostgreSQL.
7. Aplicar el alcance por paciente en backend; la cuenta profesional solo accede a sus pacientes asignados activamente.
8. Permitir elegir tema claro u oscuro y conservar la preferencia en el navegador.
9. Identificar en la interfaz las funciones que aún no están implementadas como “En construcción”.

## Requisitos no funcionales

- Java 17 para el backend; React, TypeScript y Vite para el frontend.
- PostgreSQL como persistencia activa. Las migraciones Flyway versionadas deben aplicarse antes de iniciar.
- Secretos y credenciales solo en configuración externa; nunca versionados ni escritos en logs.
- Validar autorización y datos de entrada en servidor, no solo en la interfaz.
- No enviar contraseñas ni información clínica innecesaria al navegador o a los registros.
- Interfaz adaptable a escritorio y móvil, navegación accesible por teclado y etiquetas comprensibles.

## Fuente de estado

Esta lista describe el alcance implementado en el código actual y los acuerdos del proyecto. La matriz concreta de permisos vive en `backend/config/permission-matrix-approved.csv`; las migraciones son la fuente del esquema. Las actas de sprint pueden describir estados anteriores.
