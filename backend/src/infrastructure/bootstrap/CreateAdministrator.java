package infrastructure.bootstrap;

import infrastructure.persistence.EnvironmentDatabaseConfiguration;
import infrastructure.persistence.JdbcConnectionProvider;
import shared.security.PasswordHasher;
import java.io.Console;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Arrays;
import java.util.Locale;
import java.util.UUID;

/** Local operator utility for creating an application administrator after DB-owner authentication. */
public final class CreateAdministrator {
    private CreateAdministrator() { }

    public static void main(String[] args) throws Exception {
        Console console = System.console();
        if (console == null) throw new IllegalStateException("Ejecuta esta herramienta desde una consola interactiva.");

        EnvironmentDatabaseConfiguration configuration = new EnvironmentDatabaseConfiguration();
        if (!configuration.isConfigured()) throw new IllegalStateException("Falta la configuracion externa de PostgreSQL.");

        String name = console.readLine("Nombre del nuevo administrador: ").trim();
        String email = console.readLine("Correo del nuevo administrador: ").trim();
        if (name.isBlank()) throw new IllegalArgumentException("El nombre no puede estar vacio.");
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            throw new IllegalArgumentException("Ingresa un correo valido.");

        char[] password = console.readPassword("Nueva contrasena (minimo 12 caracteres): ");
        char[] confirmation = console.readPassword("Confirma la nueva contrasena: ");
        if (password == null || confirmation == null || password.length < 12 || !Arrays.equals(password, confirmation)) {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
            throw new IllegalArgumentException("Las contrasenas no coinciden o no cumplen el minimo de 12 caracteres.");
        }

        String passwordHash;
        try { passwordHash = new PasswordHasher().generarHash(new String(password)); }
        finally {
            Arrays.fill(password, '\0');
            Arrays.fill(confirmation, '\0');
        }

        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        try (Connection connection = new JdbcConnectionProvider(configuration).open()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement check = connection.prepareStatement(
                        "SELECT 1 FROM usuarios WHERE correo_normalizado = ?")) {
                    check.setString(1, normalizedEmail);
                    try (ResultSet result = check.executeQuery()) {
                        if (result.next()) throw new IllegalStateException("Ya existe una cuenta con ese correo.");
                    }
                }
                try (PreparedStatement insert = connection.prepareStatement(
                        "INSERT INTO usuarios (id, nombre, correo, password_hash, rol, activo) VALUES (?, ?, ?, ?, 'ADMINISTRADOR', TRUE)")) {
                    insert.setObject(1, UUID.randomUUID());
                    insert.setString(2, name);
                    insert.setString(3, email);
                    insert.setString(4, passwordHash);
                    insert.executeUpdate();
                }
                connection.commit();
            } catch (Exception failure) {
                try { connection.rollback(); } catch (Exception rollback) { failure.addSuppressed(rollback); }
                throw failure;
            }
        }
        passwordHash = null;
        System.out.println("Cuenta administradora activa creada para " + email + ". Ahora ejecuta el repair-approved-permissions.ps1.");
    }
}
