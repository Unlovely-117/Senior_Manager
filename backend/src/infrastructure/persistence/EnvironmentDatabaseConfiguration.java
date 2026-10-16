package infrastructure.persistence;

/** Reads PostgreSQL connection settings from the process environment; no defaults are supplied. */
public final class EnvironmentDatabaseConfiguration implements DatabaseConfiguration {
    private final String jdbcUrl;
    private final String username;
    private final char[] password;

    public EnvironmentDatabaseConfiguration() {
        jdbcUrl = trimToNull(System.getenv("SENIOR_MANAGE_JDBC_URL"));
        username = trimToNull(System.getenv("SENIOR_MANAGE_DB_USERNAME"));
        String configuredPassword = trimToNull(System.getenv("SENIOR_MANAGE_DB_PASSWORD"));
        password = configuredPassword == null ? null : configuredPassword.toCharArray();
    }

    @Override public String getJdbcUrl() { return jdbcUrl; }
    @Override public String getUsername() { return username; }
    @Override public char[] getPassword() { return password == null ? null : password.clone(); }
    public boolean isConfigured() { return jdbcUrl != null && username != null && password != null; }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
