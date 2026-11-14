package infrastructure.persistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

/** Opens JDBC connections lazily. Requires the PostgreSQL JDBC driver at runtime. */
public final class JdbcConnectionProvider {
    private final DatabaseConfiguration configuration;

    public JdbcConnectionProvider(DatabaseConfiguration configuration) { this.configuration = configuration; }

    public Connection open() throws SQLException {
        String url = configuration.getJdbcUrl();
        String username = configuration.getUsername();
        char[] password = configuration.getPassword();
        if (url == null || url.isBlank() || username == null || username.isBlank() || password == null) {
            throw new SQLException("La configuración JDBC externa está incompleta.");
        }
        Properties properties = new Properties();
        properties.setProperty("user", username);
        properties.setProperty("password", new String(password));
        try {
            return DriverManager.getConnection(url, properties);
        } finally {
            java.util.Arrays.fill(password, '\0');
            properties.remove("password");
        }
    }
}
