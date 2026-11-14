# Pruebas Backend

Suite JUnit 5 ejecutada con Maven Surefire. No requiere PostgreSQL ni archivos de datos:
`TestLogin` usa un repositorio en memoria y una clave JWT de prueba; `TestFieldPolicies es pure unitario.

Desde `backend/`, con Java 17 y Maven instalados:

```bash
mvn test
```

- **`TestLogin`** — casos de login: credenciales correctas e incorrectas, cuenta inexistente e inactiva, campos vacíos, normalización de correo, contraseña temporal, claims JWT (subject/rol/jti), firma alterada, audiencia incorrecta, token expirado, política de re-hash y política compartida de longitud mínima (12).
- **`TestFieldPolicies`** — batería de validación de entrada (plan QA O-2.3): cédula con letras rechazada, pegado con formato normalizado, límites de longitud, teléfono con letras, nombres imposibles, fechas de nacimiento futuras o mayores de 120 años, y textos acotados.

Nota de rendimiento: PBKDF2 está configurado a 600.000 iteraciones (OWASP), por lo que la llegada de casos con hash puede tardar ~1 s. Los casos se comparten vía `@BeforeAll`.

La suite no valida la ruta HTTP ni el registro/revocación de sesión en PostgreSQL; eso requiere una base de integración aislada.

Las pruebas usan datos ficticios. Nunca apuntar un ejercicio de integración a datos reales de pacientes.
