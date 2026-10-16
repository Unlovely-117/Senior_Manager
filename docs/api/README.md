# Senior-Manage API

## Acceso y permisos

La API expone rutas bajo `/api`. Requiere sesión autenticada y verifica los permisos efectivos en PostgreSQL en cada módulo. Los módulos profesionales también limitan los datos a pacientes con asignación activa. Las cuentas y permisos no se leen desde TXT.

La lista de endpoints se obtiene en `backend/src/presentation/SeniorManageApiServer.java`; los nombres de módulo/acción se documentan en `backend/config/permission-matrix-approved.csv`. La API de desarrollo escucha localmente en el puerto 8080; Vite reenvía `/api` al servidor. `GET /api/health` permite comprobar conexión, esquema y permisos, sin iniciar la aplicación completa.

## Profesionales y ficha

`GET /api/profesionales` lista cuentas y fichas desde PostgreSQL. `POST /api/profesionales` crea una ficha vinculada a una cuenta existente con rol profesional. `PUT /api/profesionales/{document}` permite al administrador editar identidad visible, contacto, especialidad, registro profesional, formación, experiencia y presentación. Los valores largos están limitados en el backend.

El profesional consulta/actualiza su ficha en `/api/mi-perfil-profesional`; un envío la deja pendiente de revisión. El administrador decide si la verifica o solicita cambios. Las contraseñas no se incluyen en las respuestas.

## Base de datos y archivos TXT

PostgreSQL es la persistencia activa de cuentas, profesionales, sesiones, permisos, pacientes, antecedentes, asignaciones, citas y ejercicios. El backend no lee ni escribe `usuarios.txt` ni `profesionales.txt`; esos datos y las implementaciones de repositorio TXT se retiraron.

El historial del proyecto incluye una etapa temprana en la que usuarios y profesionales se almacenaban en archivos TXT. Las migraciones posteriores llevaron la persistencia a PostgreSQL. La importación se realizó durante la migración y su herramienta puntual ya fue retirada; no se necesita para el uso normal ni participa en el arranque. La ubicación de la base la determina `SENIOR_MANAGE_JDBC_URL`; el almacenamiento físico se consulta en PostgreSQL con `SHOW data_directory;`.
