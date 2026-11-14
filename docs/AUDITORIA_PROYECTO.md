# Informe de Auditoría Técnica Integral: Senior-Manage

**Fecha de Auditoría:** Noviembre 2026  
**Alcance:** Repositorio completo (Backend Java 17, Frontend React/TypeScript, Base de Datos PostgreSQL/Flyway, Infraestructura y Configuración).  
**Clasificación del Proyecto:** Aplicación web de coordinación geriátrica y seguimiento clínico de adultos mayores.

---

## 1. Resumen Ejecutivo

Senior-Manage es una plataforma orientada a la atención multidisciplinaria de adultos mayores (60-100 años), permitiendo a administradores y profesionales de la salud gestionar pacientes, antecedentes médicos, asignaciones clínicas, agenda de citas y planes de ejercicios físicos con alertas de contraindicaciones.

El proyecto evidencia bases sólidas en **seguridad criptográfica** (hashing de contraseñas con PBKDF2-SHA256, tokens JWT estrictos y control RBAC en base de datos) y un esquema relacional bien modelado con Flyway. Sin embargo, presenta **deuda técnica y arquitectónica crítica**:
1. Erosión arquitectónica hacia una clase monolítica (*God Class*) en el backend que ejecuta SQL directamente en la capa de presentación.
2. Ausencia de un *Connection Pool* JDBC y falta de transacciones ACID en operaciones críticas.
3. Exposición de credenciales históricas en texto plano en archivos legados en el repositorio.
4. Código muerto y huérfano en el frontend (~27 KB), junto con navegación dependiente de estado en lugar de un enrutador real.
5. Inexistencia de un arnés de pruebas automatizadas estándar (sin JUnit, sin Vitest/Jest, sin CI/CD).

### Calificación Global por Áreas

| Dimensión | Puntuación (1-5) | Estado | Hallazgo Principal |
| :--- | :---: | :---: | :--- |
| **Seguridad y Criptografía** | **3.8** / 5.0 | ⚠️ Aceptable con alertas | PBKDF2 y JWT muy sólidos, pero hay archivos `.txt` con contraseñas en el repositorio. |
| **Arquitectura de Software** | **2.9** / 5.0 | ⚠️ Requiere atención | Monolito de presentación (`SeniorManageApiServer`) con SQL directo; capas de dominio eludidas. |
| **Base de Datos y Persistencia** | **3.5** / 5.0 | ⚠️ Aceptable con mejoras | Buen esquema y migraciones Flyway V1-V6, pero sin pool de conexiones (HikariCP) ni rollback transaccional. |
| **Frontend y Experiencia (UX)** | **3.2** / 5.0 | ⚠️ Aceptable con mejoras | Interfaz moderna en Tailwind, pero con código huérfano y navegación sin URL (rompe historial y F5). |
| **Pruebas y QA (Testing)** | **1.8** / 5.0 | ❌ Crítico | Pruebas manuales con `main()`, 0% pruebas en frontend, sin plugin surefire ni pipelines CI/CD. |
| **DevOps y Mantenibilidad** | **2.5** / 5.0 | ⚠️ Requiere atención | Scripts PowerShell acoplados a rutas locales; sin Maven Wrapper (`mvnw`); raíz contaminada con `node_modules`. |

---

## 2. Hallazgos Detallados por Componente

### 2.1 Backend (Java 17 / Sun HttpServer / JDBC)

#### A. Arquitectura y Diseño
- **Erosión de la Arquitectura Hexagonal / Limpia**: En `backend/src/presentation/SeniorManageApiServer.java` (1,781 líneas), coexisten responsabilidades de enrutamiento HTTP, parsing manual de formularios, serialización JSON por concatenación de strings y consultas SQL en crudo.
- **Salto de Capas en Módulos Nuevos**: Mientras que `Usuarios`, `Profesionales` y `Pacientes` poseen casos de uso (`application/usecases/`) y repositorios (`domain/` e `infrastructure/`), los módulos de `Citas`, `Planes de Ejercicios`, `Seguimientos` y `Catálogo` ejecutan queries SQL directamente dentro del servidor de presentación sin pasar por capas de Dominio ni Casos de Uso.
- **Rollback Manual en Lugar de Transacciones ACID**: En el método `eliminarProfesionalCompleto`, se realiza un borrado secuencial y, si falla el segundo paso, se intenta restaurar el registro en un bloque `catch` (`professionals.registrarProfesional(profile)`). Esto viola la atomicidad transaccional; si el proceso se cae o se interrumpe la red, la base de datos queda inconsistente. Debe utilizarse `Connection.setAutoCommit(false)` con `commit()` y `rollback()`.
- **Ausencia de un Connection Pool**: `JdbcConnectionProvider.open()` invoca `DriverManager.getConnection()` en cada llamada HTTP. Esto genera un alto consumo de CPU y latencia (handshake TCP + SSL en cada request) y provocará rápidamente errores de `Too many connections` en PostgreSQL con usuarios concurrentes.

#### B. Protocolo y Serialización
- **Parsing Manual `application/x-www-form-urlencoded`**: `SeniorManageApiServer` parsea solicitudes con un método propio `readForm` con un límite estricto de 16 KB. Esto causa que datos extensos (fichas clínicas, antecedentes o biografías profesionales) fallen de forma silenciosa o con error 400.
- **Construcción Manual de JSON**: Los endpoints serializan objetos construyendo strings mediante `StringBuilder` y un método manual `json()`. No hay uso de librerías estándar como Jackson, Gson o Jakarta JSON, aumentando el riesgo de errores en caracteres especiales y sobrecosto de mantenimiento.

---

### 2.2 Seguridad y Protección de Datos

#### A. Fortalezas
- **PBKDF2-SHA256**: Implementación impecable en `PasswordHasher.java` con 65,536 iteraciones, salting criptográfico aleatorio de 16 bytes y comparación de hashes en tiempo constante (`MessageDigest.isEqual`) contra ataques de temporización.
- **Validación Estricta de JWT**: En `JwtTokenService.java`, se fuerza el algoritmo `HS256`, se valida el `iss`, `aud`, expiración (15 minutos) y soporte nativo para rotación de claves (`currentKeyId` y `previousKeyId`).
- **Prevención de SQL Injection**: Los repositorios existentes utilizan consistentemente `PreparedStatement` con parámetros enlazados (`?`), evitando inyecciones SQL en parámetros de entrada.
- **Configuración Externa**: `EnvironmentDatabaseConfiguration` y `EnvironmentJwtConfiguration` leen credenciales exclusivamente de variables de entorno y fallan en el arranque si no se proporcionan, sin valores por defecto inseguros.

#### B. Vulnerabilidades y Riesgos
- **Exposición de Credenciales en Archivos Legados**:
  - `backend/data/usuarios.txt` contiene correos y contraseñas legadas en texto plano (ej. Wendy, Laura, Sofia, Carmensa).
  - A pesar de que la documentación afirma que estos archivos fueron retirados, los archivos y sus clases (`ArchivoUsuarios.java`, `ArchivoProfesionales.java`) siguen en el árbol de código.
- **Almacenamiento de Token en el Cliente**:
  - `managementApi.ts` guarda el JWT en `sessionStorage`. Si existe una vulnerabilidad XSS en el frontend, el token puede ser extraído por scripts maliciosos. Para entornos de alta seguridad clínica, se recomienda autenticación basada en cookies seguras con flags `HttpOnly; Secure; SameSite=Strict`.
- **CORS Estático**:
  - En `SeniorManageApiServer.java`, el origen permitido está predeterminado a `http://localhost:5173`. Debe desacoplarse para aceptar una lista configurable de dominios en producción.

---

### 2.3 Base de Datos (PostgreSQL & Flyway)

- **Migraciones Versionadas (V1 a V6)**:
  - Excelente diseño relacional en tablas nucleares (`pacientes`, `antecedentes`, `usuarios`, `profesionales`, `citas`, `seguimientos_ejercicios`, `catalogo_ejercicios`, `planes_ejercicios`).
  - Uso correcto de columnas calculadas almacenadas (`documento_normalizado`, `correo_normalizado`) con restricciones de unicidad.
  - Índices parciales bien ubicados para optimizar consultas de asignaciones y sesiones activas (`WHERE estado = 'ACTIVA' AND fecha_fin IS NULL`, `WHERE revocada_en IS NULL`).
- **Módulo Clínico Preventivo (V6)**:
  - El catálogo de ejercicios incluye un array de restricciones clínicas (`restricciones_clinicas TEXT[]`) que alerta cuando un paciente presenta antecedentes de riesgo (ej. riesgo de caídas, hipotensión ortostática, prótesis). Esta funcionalidad agrega gran valor al cuidado geriátrico.

---

### 2.4 Frontend (React 18, TypeScript, Tailwind, Vite)

#### A. Código Muerto y Archivos Huérfanos (~27 KB)
- **`App.tsx` Inactivo**: El punto de entrada `main.tsx` monta directamente `<AppRouter />`. El archivo `frontend/presentation/App.tsx` está abandonado y completamente desconectado.
- **Páginas Desconectadas**:
  - `BocetoPresentacion.tsx` (6.6 KB) - No se utiliza.
  - `Home.tsx` (11.2 KB) - No se utiliza.
  - `Login.tsx` (2.8 KB) - El inicio de sesión real está implementado dentro de `AppRouter.tsx`.
  - `ProfessionalsDashboard.tsx` (1.7 KB) - Huérfano; se utiliza `ProfessionalsPage.tsx`.
  - `ProfessionalForm.tsx` (3.5 KB) - Huérfano.
- **Dependencia No Utilizada**: Se incluye `react-router-dom: ^6.26.0` en `frontend/package.json` pero ninguna página activa hace uso de sus componentes (`Route`, `Routes`, `useNavigate`).

#### B. Navegación y Usabilidad (UX)
- **Enrutamiento por Estado en lugar de URLs**:
  - `AppRouter.tsx` conmuta las pantallas mediante un estado local `useState('panel')`.
  - **Consecuencias:**
    1. Si el usuario presiona **F5 / Recargar**, se pierde la pantalla actual y vuelve a la raíz.
    2. Los botones **Atrás / Adelante** del navegador no funcionan.
    3. No se pueden compartir enlaces directos a pantallas específicas (ej. `/pacientes` o `/citas`).

#### C. Contaminación del Directorio Raíz
- En la raíz del repositorio existen los archivos `package.json`, `package-lock.json` y una carpeta `node_modules` que solo contienen `react-router-dom: ^7.18.4`. Esto fue generado por una ejecución accidental de `npm install` en la raíz en lugar de la carpeta `frontend/`.

---

### 2.5 Calidad de Software, Testing y DevOps

- **Estructura de Pruebas No Convencional**:
  - Las pruebas backend (`PruebaLogin.java`, `PruebaGestionarUsuarios.java`, `PruebaGestionarUsuariosProfesionales.java`) no usan JUnit 5 ni TestNG; son programas ejecutables con métodos `main(String[] args)` y chequeos booleanos manuales.
  - `mvn test` no detecta ni ejecuta ninguna prueba (falta `maven-surefire-plugin` y las clases no siguen la convención de nomenclatura `*Test.java`).
- **Cero Pruebas en Frontend**:
  - La carpeta `frontend/tests/` únicamente tiene un archivo `README.md`. No hay pruebas unitarias, de integración ni E2E configuradas.
- **Portabilidad de Entorno**:
  - Falta el Maven Wrapper (`mvnw` y `mvnw.cmd`). Si el desarrollador o servidor de integración no tiene Maven preinstalado en el PATH del sistema, la compilación falla.
  - El script `backend/scripts/start-local-api.ps1` contiene una ruta rígida a un JDK específico (`C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`), lo que genera fallos en otros equipos a menos que se modifique manualmente.
- **Ausencia de CI/CD**:
  - No existen flujos de trabajo de GitHub Actions (`.github/workflows/`) para verificar pull requests, compilar el proyecto o auditar vulnerabilidades (`npm audit`, validación de dependencias).

---

## 3. Matriz de Prioridad de Remediación

```
+-----------------------------------------------------------------------------------+
| CUADRANTE DE ACCIÓN INMEDIATA (Alta Prioridad / Menor Esfuerzo)                   |
| 1. Eliminar archivos TXT con contraseñas legadas expuestas                       |
| 2. Purgar package.json y node_modules accidentales de la raíz del proyecto       |
| 3. Eliminar código muerto en frontend (App.tsx, Boceto, Login, Home, etc.)       |
| 4. Parametrizar start-local-api.ps1 para resolver JAVA_HOME dinámicamente        |
+-----------------------------------------------------------------------------------+
| CUADRANTE ESTRATÉGICO (Alta Prioridad / Mayor Esfuerzo)                           |
| 5. Incorporar HikariCP para Connection Pooling en JDBC                           |
| 6. Implementar transaccionalidad ACID en operaciones compuestas (rollback real)  |
| 7. Modularizar SeniorManageApiServer (extraer controladores y usecases)          |
| 8. Migrar pruebas backend a JUnit 5 + AssertJ e integrar Surefire                |
| 9. Activar React Router real en AppRouter.tsx                                    |
| 10. Configurar pipeline de CI en GitHub Actions (.github/workflows/ci.yml)       |
+-----------------------------------------------------------------------------------+
```

---

## 4. Hoja de Ruta de Remediación (Action Plan)

### Fase 1: Higiene, Seguridad Inmediata y Limpieza (1 - 2 días)
1. **Remoción de Credenciales y Archivos Obsoletos**:
   - Eliminar `backend/data/usuarios.txt`, `backend/data/profesionales.txt` y los adaptadores `ArchivoUsuarios.java` y `ArchivoProfesionales.java`.
2. **Saneamiento de la Raíz del Proyecto**:
   - Eliminar `package.json`, `package-lock.json` y `node_modules/` ubicados en la raíz del repositorio.
3. **Depuración de Código Muerto en Frontend**:
   - Eliminar `frontend/presentation/App.tsx`, `BocetoPresentacion.tsx`, `Home.tsx`, `Login.tsx`, `ProfessionalsDashboard.tsx` y `ProfessionalForm.tsx`.
4. **Generalización de Scripts de Inicio**:
   - Parametrizar `start-local-api.ps1` para que resuelva `JAVA_HOME` dinámicamente desde el entorno.

### Fase 2: Robustez de Persistencia y Estabilidad Backend (3 - 5 días)
1. **Adición de Pool de Conexiones JDBC**:
   - Incorporar la dependencia de `HikariCP` en `backend/pom.xml`.
   - Reemplazar la instanciación directa de `DriverManager.getConnection()` en `JdbcConnectionProvider` por un `HikariDataSource`.
2. **Atomicidad Transaccional**:
   - Modificar las operaciones que tocan múltiples tablas (`eliminarProfesionalCompleto`, asignaciones) para usar transacciones formales (`connection.setAutoCommit(false)`, `commit()`, `rollback()`).
3. **Maven Wrapper**:
   - Generar `mvnw` y `mvnw.cmd` para garantizar compilación reproducible sin depender del PATH del sistema operativo.

### Fase 3: Desacoplamiento Arquitectónico y Enrutamiento (1 - 2 semanas)
1. **Modularización de `SeniorManageApiServer.java`**:
   - Extraer controladores específicos por módulo y crear los casos de uso y repositorios de dominio faltantes para `Citas` y `Ejercicios`.
2. **Activación de React Router en Frontend**:
   - Migrar `AppRouter.tsx` al estándar de `react-router-dom` con rutas explícitas (`/login`, `/panel`, `/pacientes`, `/citas`, `/ejercicios`).

### Fase 4: Garantía de Calidad (QA) e Integración Continua (1 semana)
1. **Modernización del Arnés de Pruebas**:
   - Agregar `junit-jupiter` y `assertj-core` a `backend/pom.xml`.
   - Convertir las pruebas CLI existentes a pruebas unitarias estándar.
   - Configurar `vitest` en `frontend/`.
2. **Automatización CI/CD**:
   - Crear `.github/workflows/ci.yml` para compilar backend, ejecutar pruebas y validar el frontend en cada Push y Pull Request.

---

## 5. Conclusión y Veredicto

El proyecto **Senior-Manage** cuenta con una propuesta funcional de gran valor asistencial, una base de datos relacional sólida y buenas prácticas en algoritmos criptográficos. No obstante, se encuentra en un estado típico de transición rápida de prototipo a producción. 

La implementación de las Fases 1 y 2 resolverá los riesgos críticos de seguridad y rendimiento a corto plazo, preparando la plataforma para un escalado confiable en entornos de atención médica real.

