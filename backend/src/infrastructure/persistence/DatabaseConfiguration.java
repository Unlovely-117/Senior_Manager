package infrastructure.persistence;

/** External JDBC connection settings; implementations must never embed credentials. */
public interface DatabaseConfiguration {

    String getJdbcUrl();

    String getUsername();

    char[] getPassword();
}
