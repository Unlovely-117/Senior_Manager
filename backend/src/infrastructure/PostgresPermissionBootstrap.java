package infrastructure;

import domain.entities.Permiso;
import domain.entities.Rol;
import infrastructure.persistence.JdbcConnectionProvider;
import infrastructure.persistence.PersistenceException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

/** One-time transaction for an explicitly approved permission matrix; never callable through HTTP. */
public final class PostgresPermissionBootstrap {
    private final JdbcConnectionProvider connections;
    public PostgresPermissionBootstrap(JdbcConnectionProvider connections) { this.connections = connections; }

    public void initialize(String actorEmail, List<RolePermission> permissions, String approvedHash) {
        if (permissions == null || permissions.isEmpty()) throw new IllegalArgumentException("La matriz aprobada está vacía.");
        if (approvedHash == null || !approvedHash.matches("(?i)[0-9a-f]{64}"))
            throw new IllegalArgumentException("Falta una aprobación externa de matriz mediante su SHA-256.");
        String deleteExisting = "SELECT EXISTS (SELECT 1 FROM permission_bootstrap_state) OR EXISTS (SELECT 1 FROM permisos_rol)";
        String insertPermission = "INSERT INTO permisos_rol (rol, modulo, operacion, permitido) VALUES (?, ?, ?, ?)";
        String marker = "INSERT INTO permission_bootstrap_state (singleton, completed_at, actor_email, configuration_sha256) VALUES (TRUE, CURRENT_TIMESTAMP, ?, ?)";
        try (Connection c = connections.open()) {
            c.setAutoCommit(false);
            try {
                try (PreparedStatement lock = c.prepareStatement("LOCK TABLE permission_bootstrap_state IN EXCLUSIVE MODE")) { lock.execute(); }
                try (PreparedStatement check = c.prepareStatement(deleteExisting); ResultSet r = check.executeQuery()) {
                    if (!r.next() || r.getBoolean(1)) throw new IllegalStateException("Ya existe configuración de permisos; el bootstrap no puede sobrescribirla.");
                }
                try (PreparedStatement insert = c.prepareStatement(insertPermission)) {
                    for (RolePermission item : permissions) {
                        insert.setString(1, item.role().name()); insert.setString(2, item.permission().getModulo());
                        insert.setString(3, item.permission().getOperacion()); insert.setBoolean(4, item.permission().isPermitido());
                        insert.addBatch();
                    }
                    insert.executeBatch();
                }
                try (PreparedStatement state = c.prepareStatement(marker)) {
                    state.setString(1, actorEmail.trim().toLowerCase(java.util.Locale.ROOT));
                    state.setString(2, approvedHash.toLowerCase(java.util.Locale.ROOT));
                    state.executeUpdate();
                }
                c.commit();
            } catch (SQLException | RuntimeException failure) {
                try { c.rollback(); } catch (SQLException rollback) { failure.addSuppressed(rollback); }
                throw failure;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo completar el bootstrap de permisos.", e); }
    }

    /** Explicit operator-only replacement of an already initialized matrix with the externally approved CSV. */
    public void replaceExisting(String actorEmail, List<RolePermission> permissions, String approvedHash) {
        if (permissions == null || permissions.isEmpty()) throw new IllegalArgumentException("La matriz aprobada está vacía.");
        if (approvedHash == null || !approvedHash.matches("(?i)[0-9a-f]{64}"))
            throw new IllegalArgumentException("Falta una aprobación externa de matriz mediante su SHA-256.");
        try (Connection c = connections.open()) {
            c.setAutoCommit(false);
            try {
                try (PreparedStatement lock = c.prepareStatement("LOCK TABLE permission_bootstrap_state IN EXCLUSIVE MODE")) { lock.execute(); }
                try (PreparedStatement check = c.prepareStatement("SELECT EXISTS (SELECT 1 FROM permission_bootstrap_state WHERE singleton = TRUE), EXISTS (SELECT 1 FROM permisos_rol)");
                     ResultSet r = check.executeQuery()) {
                    if (!r.next() || !r.getBoolean(1) || !r.getBoolean(2))
                        throw new IllegalStateException("La base no tiene un bootstrap previo válido; usa el comando inicial.");
                }
                try (PreparedStatement delete = c.prepareStatement("DELETE FROM permisos_rol")) { delete.executeUpdate(); }
                try (PreparedStatement insert = c.prepareStatement("INSERT INTO permisos_rol (rol, modulo, operacion, permitido) VALUES (?, ?, ?, ?)")) {
                    for (RolePermission item : permissions) {
                        insert.setString(1, item.role().name()); insert.setString(2, item.permission().getModulo());
                        insert.setString(3, item.permission().getOperacion()); insert.setBoolean(4, item.permission().isPermitido());
                        insert.addBatch();
                    }
                    insert.executeBatch();
                }
                try (PreparedStatement state = c.prepareStatement("UPDATE permission_bootstrap_state SET completed_at = CURRENT_TIMESTAMP, actor_email = ?, configuration_sha256 = ? WHERE singleton = TRUE")) {
                    state.setString(1, actorEmail.trim().toLowerCase(java.util.Locale.ROOT));
                    state.setString(2, approvedHash.toLowerCase(java.util.Locale.ROOT));
                    if (state.executeUpdate() != 1) throw new IllegalStateException("No se pudo actualizar el marcador del bootstrap.");
                }
                c.commit();
            } catch (SQLException | RuntimeException failure) {
                try { c.rollback(); } catch (SQLException rollback) { failure.addSuppressed(rollback); }
                throw failure;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo reconciliar la matriz aprobada.", e); }
    }

    /** Initialize an empty database or atomically reconcile an existing matrix to the exact approved CSV. */
    public void applyApproved(String actorEmail, List<RolePermission> permissions, String approvedHash) {
        if (permissions == null || permissions.isEmpty()) throw new IllegalArgumentException("La matriz aprobada está vacía.");
        if (approvedHash == null || !approvedHash.matches("(?i)[0-9a-f]{64}"))
            throw new IllegalArgumentException("Falta una aprobación externa de matriz mediante su SHA-256.");
        try (Connection c = connections.open()) {
            c.setAutoCommit(false);
            try {
                try (PreparedStatement lock = c.prepareStatement("LOCK TABLE permission_bootstrap_state IN EXCLUSIVE MODE")) { lock.execute(); }
                boolean hasMarker;
                boolean hasPermissions;
                try (PreparedStatement check = c.prepareStatement("SELECT EXISTS (SELECT 1 FROM permission_bootstrap_state WHERE singleton = TRUE), EXISTS (SELECT 1 FROM permisos_rol)");
                     ResultSet r = check.executeQuery()) {
                    if (!r.next()) throw new IllegalStateException("No se pudo comprobar el estado del bootstrap.");
                    hasMarker = r.getBoolean(1);
                    hasPermissions = r.getBoolean(2);
                }
                if (hasMarker != hasPermissions)
                    throw new IllegalStateException("La configuración de permisos está incompleta; se requiere revisión manual antes de modificarla.");
                if (hasPermissions) {
                    try (PreparedStatement delete = c.prepareStatement("DELETE FROM permisos_rol")) { delete.executeUpdate(); }
                }
                try (PreparedStatement insert = c.prepareStatement("INSERT INTO permisos_rol (rol, modulo, operacion, permitido) VALUES (?, ?, ?, ?)")) {
                    for (RolePermission item : permissions) {
                        insert.setString(1, item.role().name()); insert.setString(2, item.permission().getModulo());
                        insert.setString(3, item.permission().getOperacion()); insert.setBoolean(4, item.permission().isPermitido());
                        insert.addBatch();
                    }
                    insert.executeBatch();
                }
                if (hasMarker) {
                    try (PreparedStatement state = c.prepareStatement("UPDATE permission_bootstrap_state SET completed_at = CURRENT_TIMESTAMP, actor_email = ?, configuration_sha256 = ? WHERE singleton = TRUE")) {
                        state.setString(1, actorEmail.trim().toLowerCase(java.util.Locale.ROOT));
                        state.setString(2, approvedHash.toLowerCase(java.util.Locale.ROOT));
                        if (state.executeUpdate() != 1) throw new IllegalStateException("No se pudo actualizar el marcador del bootstrap.");
                    }
                } else {
                    try (PreparedStatement state = c.prepareStatement("INSERT INTO permission_bootstrap_state (singleton, completed_at, actor_email, configuration_sha256) VALUES (TRUE, CURRENT_TIMESTAMP, ?, ?)")) {
                        state.setString(1, actorEmail.trim().toLowerCase(java.util.Locale.ROOT));
                        state.setString(2, approvedHash.toLowerCase(java.util.Locale.ROOT));
                        state.executeUpdate();
                    }
                }
                c.commit();
            } catch (SQLException | RuntimeException failure) {
                try { c.rollback(); } catch (SQLException rollback) { failure.addSuppressed(rollback); }
                throw failure;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo aplicar la matriz aprobada.", e); }
    }

    public record RolePermission(Rol role, Permiso permission) { }
}
