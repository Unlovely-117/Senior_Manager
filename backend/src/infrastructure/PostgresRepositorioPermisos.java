package infrastructure;

import domain.RepositorioPermisos;
import domain.entities.Permiso;
import domain.entities.Rol;
import infrastructure.persistence.JdbcConnectionProvider;
import infrastructure.persistence.PersistenceException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/** Stores explicit role/module/operation decisions; no default grants are seeded. */
public final class PostgresRepositorioPermisos implements RepositorioPermisos {
    private final JdbcConnectionProvider connections;
    public PostgresRepositorioPermisos(JdbcConnectionProvider connections) { this.connections = connections; }
    @Override public List<Permiso> listarPorRol(Rol rol) {
        String sql = "SELECT modulo, operacion, permitido FROM permisos_rol WHERE rol = ? ORDER BY modulo, operacion";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, rol.name());
            try (ResultSet r = s.executeQuery()) {
                List<Permiso> result = new ArrayList<>();
                while (r.next()) result.add(new Permiso(r.getString("modulo"), r.getString("operacion"), r.getBoolean("permitido")));
                return result;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo consultar la configuración de permisos.", e); }
    }
    @Override public void reemplazarConfiguracion(Rol rol, List<Permiso> permisos) {
        String delete = "DELETE FROM permisos_rol WHERE rol = ?";
        String insert = "INSERT INTO permisos_rol (rol, modulo, operacion, permitido) VALUES (?, ?, ?, ?)";
        try (Connection c = connections.open()) {
            boolean priorAutoCommit = c.getAutoCommit();
            c.setAutoCommit(false);
            try {
                try (PreparedStatement d = c.prepareStatement(delete)) { d.setString(1, rol.name()); d.executeUpdate(); }
                try (PreparedStatement i = c.prepareStatement(insert)) {
                    for (Permiso p : permisos) {
                        i.setString(1, rol.name()); i.setString(2, p.getModulo());
                        i.setString(3, p.getOperacion()); i.setBoolean(4, p.isPermitido()); i.addBatch();
                    }
                    i.executeBatch();
                }
                c.commit();
            } catch (SQLException | RuntimeException e) {
                try { c.rollback(); } catch (SQLException rollbackFailure) { e.addSuppressed(rollbackFailure); }
                throw e;
            } finally {
                try { c.setAutoCommit(priorAutoCommit); } catch (SQLException ignored) { /* connection closes */ }
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo guardar la configuración de permisos.", e); }
    }

    @Override public void guardarPermiso(Rol rol, Permiso permiso) {
        String sql = "INSERT INTO permisos_rol (rol, modulo, operacion, permitido) VALUES (?, ?, ?, ?) "
            + "ON CONFLICT (rol, modulo, operacion) DO UPDATE SET permitido = EXCLUDED.permitido";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, rol.name()); s.setString(2, permiso.getModulo());
            s.setString(3, permiso.getOperacion()); s.setBoolean(4, permiso.isPermitido()); s.executeUpdate();
        } catch (SQLException e) { throw new PersistenceException("No se pudo guardar el permiso.", e); }
    }
}
