package infrastructure.bootstrap;

import application.usecases.GestionarUsuarios;
import domain.entities.Permiso;
import domain.entities.Rol;
import infrastructure.PostgresRepositorioUsuarios;
import infrastructure.PostgresPermissionBootstrap;
import infrastructure.persistence.EnvironmentDatabaseConfiguration;
import infrastructure.persistence.JdbcConnectionProvider;
import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

/** Explicit operator-only CLI. Not routed by SeniorManageApiServer and intentionally never run automatically. */
public final class PermissionBootstrap {
    private PermissionBootstrap() { }

    public static void main(String[] args) throws Exception {
        boolean replaceExisting = args.length == 2 && "--replace-existing".equals(args[0]);
        boolean applyApproved = args.length == 2 && "--apply-approved".equals(args[0]);
        String matrixPath = replaceExisting || applyApproved ? args[1] : args.length == 1 ? args[0] : null;
        if (matrixPath == null) throw new IllegalArgumentException(
            "Uso: PermissionBootstrap <matriz.csv> (inicializar una base vacia), --replace-existing <matriz.csv> (reemplazar matriz existente) o --apply-approved <matriz.csv> (inicializar o reconciliar de forma segura).");
        Console console = System.console();
        if (console == null) throw new IllegalStateException("El bootstrap requiere una consola interactiva segura.");
        String expectedSecret = requiredEnv("SENIOR_MANAGE_PERMISSION_BOOTSTRAP_SECRET");
        if (expectedSecret.getBytes(StandardCharsets.UTF_8).length < 32)
            throw new IllegalStateException("SENIOR_MANAGE_PERMISSION_BOOTSTRAP_SECRET debe contener al menos 32 bytes.");
        String approvedHash = requiredEnv("SENIOR_MANAGE_PERMISSION_MATRIX_SHA256");
        if (!applyApproved) {
            char[] suppliedSecret = console.readPassword(replaceExisting
                ? "Secreto externo para aplicar la matriz aprobada: "
                : "Secreto externo de inicializacion: ");
            if (suppliedSecret == null || !MessageDigest.isEqual(expectedSecret.getBytes(StandardCharsets.UTF_8),
                    new String(suppliedSecret).getBytes(StandardCharsets.UTF_8))) {
                if (suppliedSecret != null) java.util.Arrays.fill(suppliedSecret, '\0');
                throw new SecurityException("El secreto de inicializacion no es valido.");
            }
            java.util.Arrays.fill(suppliedSecret, '\0');
        }
        byte[] matrixBytes = Files.readAllBytes(Path.of(matrixPath));
        String matrixHash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(matrixBytes));
        if (!MessageDigest.isEqual(matrixHash.getBytes(StandardCharsets.US_ASCII), approvedHash.toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.US_ASCII)))
            throw new SecurityException("La matriz no coincide con la aprobación externa.");
        List<PostgresPermissionBootstrap.RolePermission> permissions = parse(new String(matrixBytes, StandardCharsets.UTF_8));
        java.util.Arrays.fill(matrixBytes, (byte) 0);

        String email = console.readLine("Correo de cuenta administradora existente: ");
        char[] password = console.readPassword("Contraseña de esa cuenta: ");
        if (password == null) throw new SecurityException("No se recibió autenticación de administrador.");
        String passwordValue = new String(password);
        java.util.Arrays.fill(password, '\0');
        GestionarUsuarios users = new GestionarUsuarios(new PostgresRepositorioUsuarios(
            new JdbcConnectionProvider(new EnvironmentDatabaseConfiguration())));
        var administrator = users.autenticarUsuario(email, passwordValue);
        passwordValue = null;
        if (administrator == null || administrator.getRol() != Rol.ADMINISTRADOR || !administrator.isActivo())
            throw new SecurityException("La autenticación no corresponde a una cuenta administradora activa.");

        EnvironmentDatabaseConfiguration database = new EnvironmentDatabaseConfiguration();
        if (!database.isConfigured()) throw new IllegalStateException("Falta la configuración externa de PostgreSQL.");
        PostgresPermissionBootstrap permissionBootstrap = new PostgresPermissionBootstrap(new JdbcConnectionProvider(database));
        if (applyApproved) permissionBootstrap.applyApproved(administrator.getCorreo(), permissions, matrixHash);
        else if (replaceExisting) permissionBootstrap.replaceExisting(administrator.getCorreo(), permissions, matrixHash);
        else permissionBootstrap.initialize(administrator.getCorreo(), permissions, matrixHash);
        console.printf(applyApproved || replaceExisting
            ? "Matriz aprobada reconciliada de forma transaccional.%n"
            : "Bootstrap de permisos completado para la matriz aprobada.%n");
    }

    private static List<PostgresPermissionBootstrap.RolePermission> parse(String content) {
        List<PostgresPermissionBootstrap.RolePermission> result = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (String raw : content.split("\\R")) {
            String line = raw.trim();
            if (line.isEmpty() || line.startsWith("#")) continue;
            String[] values = line.split(",", -1);
            if (values.length != 4) throw new IllegalArgumentException("Cada fila debe contener rol,módulo,operación,permitido.");
            Rol role = Rol.valueOf(values[0].trim().toUpperCase(java.util.Locale.ROOT));
            boolean allowed;
            if ("true".equalsIgnoreCase(values[3].trim())) allowed = true;
            else if ("false".equalsIgnoreCase(values[3].trim())) allowed = false;
            else throw new IllegalArgumentException("La decisión de permiso debe ser true o false.");
            Permiso permission = new Permiso(values[1], values[2], allowed);
            String key = role + "\u0000" + permission.getModulo() + "\u0000" + permission.getOperacion();
            if (!seen.add(key)) throw new IllegalArgumentException("La matriz contiene celdas duplicadas.");
            result.add(new PostgresPermissionBootstrap.RolePermission(role, permission));
        }
        if (result.isEmpty()) throw new IllegalArgumentException("La matriz aprobada está vacía.");
        return List.copyOf(result);
    }

    private static String requiredEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException("Falta la configuración externa " + name + ".");
        return value;
    }
}
