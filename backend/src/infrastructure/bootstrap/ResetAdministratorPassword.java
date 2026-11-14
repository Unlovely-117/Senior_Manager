package infrastructure.bootstrap;

import infrastructure.persistence.EnvironmentDatabaseConfiguration;
import infrastructure.persistence.JdbcConnectionProvider;
import shared.security.PasswordHasher;
import java.io.Console;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.UUID;

/** Locally resets an existing active administrator password and revokes its sessions. */
public final class ResetAdministratorPassword {
    private ResetAdministratorPassword() { }

    public static void main(String[] args) throws Exception {
        if (args.length != 1 || args[0].isBlank()) {
            throw new IllegalArgumentException("Proporciona el correo de la cuenta administradora.");
        }
        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException("Ejecuta esta herramienta desde una consola interactiva.");
        }

        String email = args[0].trim();
        EnvironmentDatabaseConfiguration configuration = new EnvironmentDatabaseConfiguration();
        if (!configuration.isConfigured()) {
            throw new IllegalStateException("Falta la configuracion externa de PostgreSQL.");
        }

        char[] password = console.readPassword("Nueva contrasena del administrador (minimo 12 caracteres): ");
        char[] confirmation = console.readPassword("Confirma la nueva contrasena: ");
        if (password == null || confirmation == null || password.length < 12
                || !Arrays.equals(password, confirmation)) {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
            throw new IllegalArgumentException("Las contrasenas no coinciden o no cumplen el minimo de 12 caracteres.");
        }

        String hash;
        try {
            hash = new PasswordHasher().generarHash(new String(password));
        } finally {
            Arrays.fill(password, '\0');
            Arrays.fill(confirmation, '\0');
        }

        try (JdbcConnectionProvider provider = new JdbcConnectionProvider(configuration);
    Connection connection = provider.open()) {
            connection.setAutoCommit(false);
            try {
                UUID userId;
                String findSql = "SELECT id FROM usuarios "
                    + "WHERE correo_normalizado = lower(trim(?)) AND rol = 'ADMINISTRADOR' AND activo = TRUE FOR UPDATE";
                try (PreparedStatement find = connection.prepareStatement(findSql)) {
                    find.setString(1, email);
                    try (ResultSet result = find.executeQuery()) {
                        if (!result.next()) {
                            throw new IllegalStateException("No existe un administrador activo con ese correo.");
                        }
                        userId = result.getObject("id", UUID.class);
                    }
                }

                try (PreparedStatement update = connection.prepareStatement(
                        "UPDATE usuarios SET password_hash = ? WHERE id = ?")) {
                    update.setString(1, hash);
                    update.setObject(2, userId);
                    if (update.executeUpdate() != 1) {
                        throw new IllegalStateException("No se pudo actualizar la contrasena del administrador.");
                    }
                }

                try (PreparedStatement revoke = connection.prepareStatement(
                        "UPDATE sesiones SET revocada_en = ? WHERE correo = lower(trim(?)) AND revocada_en IS NULL")) {
                    revoke.setTimestamp(1, Timestamp.from(Instant.now()));
                    revoke.setString(2, email);
                    revoke.executeUpdate();
                }
                connection.commit();
            } catch (Exception failure) {
                try {
                    connection.rollback();
                } catch (Exception rollbackFailure) {
                    failure.addSuppressed(rollbackFailure);
                }
                throw failure;
            }
        } finally {
            hash = null;
        }

        System.out.println("Contrasena actualizada y sesiones anteriores revocadas para " + email + ".");
    }
}
