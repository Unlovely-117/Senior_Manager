package infrastructure.bootstrap;

import domain.entities.Permiso;
import domain.entities.Rol;
import infrastructure.PostgresPermissionBootstrap;
import infrastructure.persistence.EnvironmentDatabaseConfiguration;
import infrastructure.persistence.JdbcConnectionProvider;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import shared.security.PasswordHasher;

/** Non-interactive startup bootstrapper for Docker/VPS deployments: waits for PostgreSQL, runs Flyway, ensures an admin account, and reconciles approved permissions. */
public final class ContainerBootstrap {
    private static final String DEFAULT_MIGRATIONS_DIR = "/app/migrations";
    private static final String DEFAULT_MATRIX_PATH = "/app/config/permission-matrix-approved.csv";
    private static final String DEFAULT_APPROVED_SHA256 = "6EDB8C419013B86D62BABAC0A9D1F9668918158AA332AA7BF5B46B9EE60FA969";
    private static final int MAX_DB_ATTEMPTS = 30;
    private static final long DB_RETRY_DELAY_MS = 2000L;
    private static final int MIN_ADMIN_PASSWORD_LENGTH = 12;
    private static final int MAX_ADMIN_PASSWORD_LENGTH = 128;

    private ContainerBootstrap() { }

    public static void main(String[] args) throws Exception {
        EnvironmentDatabaseConfiguration configuration = new EnvironmentDatabaseConfiguration();
        if (!configuration.isConfigured()) {
            throw new IllegalStateException(
                "Faltan SENIOR_MANAGE_JDBC_URL, SENIOR_MANAGE_DB_USERNAME o SENIOR_MANAGE_DB_PASSWORD."
            );
        }

        JdbcConnectionProvider connections = new JdbcConnectionProvider(configuration);
        waitForDatabase(connections);
        System.out.println("ContainerBootstrap: conexión a PostgreSQL disponible.");

        runMigrations(configuration);
        System.out.println("ContainerBootstrap: migraciones Flyway V1-V6 aplicadas/verificadas.");

        String initialAdminEmail = trimToNull(System.getenv("SENIOR_MANAGE_INITIAL_ADMIN_EMAIL"));
        String initialAdminPassword = trimToNull(System.getenv("SENIOR_MANAGE_INITIAL_ADMIN_PASSWORD"));
        String initialAdminName = trimToNull(System.getenv("SENIOR_MANAGE_INITIAL_ADMIN_NAME"));
        if (initialAdminEmail != null && initialAdminPassword != null) {
            ensureInitialAdministrator(
                connections,
                initialAdminName == null ? "Administrador Principal" : initialAdminName,
                initialAdminEmail,
                initialAdminPassword
            );
        }

        String actorEmail = findActiveAdministratorEmail(connections, initialAdminEmail);
        if (actorEmail == null) {
            throw new IllegalStateException(
                "No existe ninguna cuenta administradora activa. Define SENIOR_MANAGE_INITIAL_ADMIN_EMAIL y SENIOR_MANAGE_INITIAL_ADMIN_PASSWORD (entre 12 y 128 caracteres) en .env."
            );
        }

        ensureApprovedPermissions(connections, actorEmail);
        System.out.println("ContainerBootstrap: inicialización completada correctamente.");
    }

    private static void waitForDatabase(JdbcConnectionProvider connections) throws InterruptedException {
        SQLException lastError = null;
        for (int attempt = 1; attempt <= MAX_DB_ATTEMPTS; attempt++) {
            try (Connection ignored = connections.open()) {
                return;
            } catch (SQLException ex) {
                lastError = ex;
                System.out.println(
                    "ContainerBootstrap: esperando PostgreSQL (intento " + attempt + "/" + MAX_DB_ATTEMPTS + ")..."
                );
                if (attempt < MAX_DB_ATTEMPTS) {
                    Thread.sleep(DB_RETRY_DELAY_MS);
                }
            }
        }
        throw new IllegalStateException("PostgreSQL no respondió después de " + MAX_DB_ATTEMPTS + " intentos.", lastError);
    }

    private static void runMigrations(EnvironmentDatabaseConfiguration configuration) {
        String migrationDirectory = System.getProperty("senior.manage.migrationsDirectory", DEFAULT_MIGRATIONS_DIR);
        if (migrationDirectory == null || migrationDirectory.isBlank()) {
            migrationDirectory = DEFAULT_MIGRATIONS_DIR;
        }
        char[] password = configuration.getPassword();
        try {
            Flyway.configure()
                .dataSource(configuration.getJdbcUrl(), configuration.getUsername(), new String(password))
                .locations("filesystem:" + migrationDirectory.trim())
                .load()
                .migrate();
        } finally {
            if (password != null) {
                Arrays.fill(password, '\0');
            }
        }
    }

    private static void ensureInitialAdministrator(
            JdbcConnectionProvider connections, String name, String email, String password) throws SQLException {
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("SENIOR_MANAGE_INITIAL_ADMIN_EMAIL no tiene un formato válido.");
        }
        if (password.length() < MIN_ADMIN_PASSWORD_LENGTH || password.length() > MAX_ADMIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException(
                "SENIOR_MANAGE_INITIAL_ADMIN_PASSWORD debe tener entre "
                    + MIN_ADMIN_PASSWORD_LENGTH + " y " + MAX_ADMIN_PASSWORD_LENGTH + " caracteres."
            );
        }

        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        try (Connection connection = connections.open()) {
            connection.setAutoCommit(false);
            try {
                boolean exists;
                try (PreparedStatement check = connection.prepareStatement(
                        "SELECT 1 FROM usuarios WHERE correo_normalizado = ?")) {
                    check.setString(1, normalizedEmail);
                    try (ResultSet result = check.executeQuery()) {
                        exists = result.next();
                    }
                }
                if (!exists) {
                    String passwordHash = new PasswordHasher().generarHash(password);
                    try (PreparedStatement insert = connection.prepareStatement(
                            "INSERT INTO usuarios (id, nombre, correo, password_hash, rol, activo) VALUES (?, ?, ?, ?, 'ADMINISTRADOR', TRUE)")) {
                        insert.setObject(1, UUID.randomUUID());
                        insert.setString(2, name);
                        insert.setString(3, email);
                        insert.setString(4, passwordHash);
                        insert.executeUpdate();
                    }
                    System.out.println("ContainerBootstrap: cuenta administradora inicial creada.");
                } else {
                    System.out.println("ContainerBootstrap: cuenta administradora inicial ya existente.");
                }
                connection.commit();
            } catch (SQLException | RuntimeException failure) {
                try {
                    connection.rollback();
                } catch (SQLException rollback) {
                    failure.addSuppressed(rollback);
                }
                throw failure;
            }
        }
    }

    private static String findActiveAdministratorEmail(
            JdbcConnectionProvider connections, String preferredEmail) throws SQLException {
        try (Connection connection = connections.open()) {
            if (preferredEmail != null) {
                try (PreparedStatement preferredQuery = connection.prepareStatement(
                        "SELECT correo FROM usuarios WHERE correo_normalizado = ? AND rol = 'ADMINISTRADOR' AND activo = TRUE")) {
                    preferredQuery.setString(1, preferredEmail.toLowerCase(Locale.ROOT));
                    try (ResultSet rs = preferredQuery.executeQuery()) {
                        if (rs.next()) {
                            return rs.getString(1);
                        }
                    }
                }
            }
            try (PreparedStatement fallbackQuery = connection.prepareStatement(
                    "SELECT correo FROM usuarios WHERE rol = 'ADMINISTRADOR' AND activo = TRUE ORDER BY correo_normalizado ASC LIMIT 1");
                 ResultSet rs = fallbackQuery.executeQuery()) {
                return rs.next() ? rs.getString(1) : null;
            }
        }
    }

    private static void ensureApprovedPermissions(
            JdbcConnectionProvider connections, String actorEmail) throws Exception {
        String matrixPath = System.getProperty("senior.manage.permissionMatrixPath", DEFAULT_MATRIX_PATH);
        if (matrixPath == null || matrixPath.isBlank()) {
            matrixPath = DEFAULT_MATRIX_PATH;
        }
        String approvedHash = trimToNull(System.getenv("SENIOR_MANAGE_PERMISSION_MATRIX_SHA256"));
        if (approvedHash == null) {
            approvedHash = DEFAULT_APPROVED_SHA256;
        }

        byte[] matrixBytes = Files.readAllBytes(Path.of(matrixPath.trim()));
        String matrixHash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(matrixBytes));
        if (!MessageDigest.isEqual(
                matrixHash.getBytes(StandardCharsets.US_ASCII),
                approvedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII))) {
            Arrays.fill(matrixBytes, (byte) 0);
            throw new SecurityException("La matriz aprobada no coincide con SENIOR_MANAGE_PERMISSION_MATRIX_SHA256.");
        }

        List<PostgresPermissionBootstrap.RolePermission> permissions = parse(new String(matrixBytes, StandardCharsets.UTF_8));
        Arrays.fill(matrixBytes, (byte) 0);

        boolean needsApply = true;
        try (Connection connection = connections.open()) {
            String storedSha = null;
            boolean hasPermissions = false;
            try (PreparedStatement markerQuery = connection.prepareStatement(
                    "SELECT configuration_sha256 FROM permission_bootstrap_state WHERE singleton = TRUE");
                 ResultSet markerResult = markerQuery.executeQuery()) {
                if (markerResult.next()) {
                    storedSha = trimToNull(markerResult.getString(1));
                }
            }
            try (PreparedStatement permsQuery = connection.prepareStatement("SELECT EXISTS (SELECT 1 FROM permisos_rol)");
                 ResultSet permsResult = permsQuery.executeQuery()) {
                if (permsResult.next()) {
                    hasPermissions = permsResult.getBoolean(1);
                }
            }
            if (hasPermissions && storedSha != null && storedSha.equalsIgnoreCase(matrixHash)) {
                needsApply = false;
            }
        }

        if (needsApply) {
            new PostgresPermissionBootstrap(connections).applyApproved(actorEmail, permissions, matrixHash);
            System.out.println("ContainerBootstrap: matriz de permisos aprobada aplicada/reconciliada.");
        } else {
            System.out.println("ContainerBootstrap: matriz de permisos aprobada ya actualizada.");
        }
    }

    private static List<PostgresPermissionBootstrap.RolePermission> parse(String content) {
        List<PostgresPermissionBootstrap.RolePermission> result = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String raw : content.split("\\R")) {
            String line = raw.trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            String[] values = line.split(",", -1);
            if (values.length != 4) {
                throw new IllegalArgumentException("Cada fila debe contener rol,módulo,operación,permitido.");
            }
            Rol role = Rol.valueOf(values[0].trim().toUpperCase(Locale.ROOT));
            boolean allowed;
            if ("true".equalsIgnoreCase(values[3].trim())) {
                allowed = true;
            } else if ("false".equalsIgnoreCase(values[3].trim())) {
                allowed = false;
            } else {
                throw new IllegalArgumentException("La decisión de permiso debe ser true o false.");
            }
            Permiso permission = new Permiso(values[1], values[2], allowed);
            String key = role + "\u0000" + permission.getModulo() + "\u0000" + permission.getOperacion();
            if (!seen.add(key)) {
                throw new IllegalArgumentException("La matriz contiene celdas duplicadas.");
            }
            result.add(new PostgresPermissionBootstrap.RolePermission(role, permission));
        }
        if (result.isEmpty()) {
            throw new IllegalArgumentException("La matriz aprobada está vacía.");
        }
        return List.copyOf(result);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

