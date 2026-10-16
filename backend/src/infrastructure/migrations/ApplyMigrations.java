package infrastructure.migrations;

import infrastructure.persistence.EnvironmentDatabaseConfiguration;
import java.util.Arrays;
import org.flywaydb.core.Flyway;

/** Explicit migration entry point. It is never invoked during API startup. */
public final class ApplyMigrations {
    private ApplyMigrations() { }

    public static void main(String[] args) {
        EnvironmentDatabaseConfiguration configuration = new EnvironmentDatabaseConfiguration();
        if (!configuration.isConfigured())
            throw new IllegalStateException("Faltan SENIOR_MANAGE_JDBC_URL, SENIOR_MANAGE_DB_USERNAME o SENIOR_MANAGE_DB_PASSWORD.");
        char[] password = configuration.getPassword();
        try {
            String migrationDirectory = System.getProperty("senior.manage.migrationsDirectory");
            if (migrationDirectory == null || migrationDirectory.isBlank())
                throw new IllegalStateException("Maven no proporcionó la ruta del directorio de migraciones.");
            Flyway.configure()
                .dataSource(configuration.getJdbcUrl(), configuration.getUsername(), new String(password))
                .locations("filesystem:" + migrationDirectory)
                .load()
                .migrate();
        } finally {
            Arrays.fill(password, '\0');
        }
    }
}
