# Pruebas Backend

`PruebaLogin` ejecuta casos aislados del caso de uso de login con un repositorio en memoria y una clave JWT de prueba. No requiere PostgreSQL ni lee `backend/data/`.

Desde `backend/`, con Java 17 y Maven instalados:

```powershell
mvn test-compile exec:java "-Dexec.classpathScope=test" "-Dexec.mainClass=PruebaLogin"
```

Los casos comprueban credenciales correctas e incorrectas, cuenta inexistente e inactiva, campos vacíos, normalización de correo, contraseña temporal, emisión de claims JWT, firma alterada, audiencia incorrecta y expiración. La prueba no valida la ruta HTTP ni el registro/revocación de sesión en PostgreSQL; eso requiere una base de integración aislada.

Las pruebas usan datos ficticios. Nunca apuntar un ejercicio de integración a datos reales de pacientes.
