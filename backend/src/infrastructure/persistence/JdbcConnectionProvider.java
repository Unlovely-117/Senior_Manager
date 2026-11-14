package infrastructure.persistence;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.SQLException;

/** Serves pooled JDBC connections from HikariCP; the pool is created lazily from the external configuration. */
public final class JdbcConnectionProvider implements AutoCloseable {
    private final DatabaseConfiguration configuration;
    private volatile HikariDataSource dataSource;

    public JdbcConnectionProvider(DatabaseConfiguration configuration) { this.configuration = configuration; }

    public Connection open() throws SQLException {
        HikariDataSource pool = dataSource;
        if (pool == null) {
            synchronized (this) {
                if (dataSource == null) {
                    String url = configuration.getJdbcUrl();
                    String username = configuration.getUsername();
                    char[] password = configuration.getPassword();
                    if (url == null || url.isBlank() || username == null || username.isBlank() || password == null) {
                        throw new SQLException("La configuración JDBC externa está incompleta.");
                    }
                    HikariConfig config = new HikariConfig();
                    config.setJdbcUrl(url);
                    config.setUsername(username);
                    config.setPassword(new String(password));
                    config.setMaximumPoolSize(10);
                    config.setMinimumIdle(2);
                    config.setMaxLifetime(25 * 60 * 1000);
                    dataSource = new HikariDataSource(config);
                }
                pool = dataSource;
            }
        }
        return pool.getConnection();
    }

    @Override public void close() {
        HikariDataSource pool = dataSource;
        if (pool != null && !pool.isClosed()) pool.close();
    }
}
