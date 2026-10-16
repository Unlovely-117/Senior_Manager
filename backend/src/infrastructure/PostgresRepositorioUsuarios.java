package infrastructure;

import domain.RepositorioUsuarios;
import domain.entities.Rol;
import domain.entities.Usuario;
import infrastructure.persistence.JdbcConnectionProvider;
import infrastructure.persistence.PersistenceException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** PostgreSQL storage for accounts, keyed by immutable UUID with normalized-email lookup. */
public final class PostgresRepositorioUsuarios implements RepositorioUsuarios {
    private final JdbcConnectionProvider connections;

    public PostgresRepositorioUsuarios(JdbcConnectionProvider connections) {
        this.connections = connections;
    }

    @Override public void guardar(Usuario usuario) {
        String sql = "INSERT INTO usuarios (id, nombre, correo, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, usuario.getId());
            s.setString(2, usuario.getNombre());
            s.setString(3, usuario.getCorreo().trim());
            s.setString(4, usuario.getPasswordHash());
            s.setString(5, usuario.getRol().name());
            s.setBoolean(6, usuario.isActivo());
            s.executeUpdate();
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo guardar el usuario.", e);
        }
    }

    @Override public List<Usuario> listar() {
        String sql = "SELECT id, nombre, correo, password_hash, rol, activo FROM usuarios ORDER BY correo_normalizado, id";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql);
                ResultSet r = s.executeQuery()) {
            List<Usuario> users = new ArrayList<>();
            while (r.next()) users.add(map(r));
            return users;
        } catch (SQLException e) {
            throw new PersistenceException("No se pudieron consultar los usuarios.", e);
        }
    }

    @Override public Usuario buscarPorCorreo(String correo) {
        if (correo == null || correo.isBlank()) return null;
        String sql = "SELECT id, nombre, correo, password_hash, rol, activo FROM usuarios WHERE correo_normalizado = lower(trim(?))";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, correo);
            try (ResultSet r = s.executeQuery()) { return r.next() ? map(r) : null; }
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo consultar el usuario.", e);
        }
    }

    @Override public Usuario buscarPorId(UUID id) {
        if (id == null) return null;
        String sql = "SELECT id, nombre, correo, password_hash, rol, activo FROM usuarios WHERE id = ?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, id);
            try (ResultSet r = s.executeQuery()) { return r.next() ? map(r) : null; }
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo consultar el usuario.", e);
        }
    }

    @Override public boolean actualizar(Usuario usuario) {
        return actualizar(usuario.getCorreo(), usuario);
    }

    @Override public boolean actualizar(String correoActual, Usuario usuario) {
        String sql = "UPDATE usuarios SET nombre = ?, correo = ?, password_hash = ?, rol = ?, activo = ? "
            + "WHERE correo_normalizado = lower(trim(?)) AND id = ?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, usuario.getNombre());
            s.setString(2, usuario.getCorreo().trim());
            s.setString(3, usuario.getPasswordHash());
            s.setString(4, usuario.getRol().name());
            s.setBoolean(5, usuario.isActivo());
            s.setString(6, correoActual);
            s.setObject(7, usuario.getId());
            return s.executeUpdate() == 1;
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo actualizar el usuario.", e);
        }
    }

    @Override public boolean eliminar(String correo) {
        if (correo == null || correo.isBlank()) return false;
        String sql = "DELETE FROM usuarios WHERE correo_normalizado = lower(trim(?))";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, correo);
            return s.executeUpdate() == 1;
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo eliminar el usuario.", e);
        }
    }

    private static Usuario map(ResultSet r) throws SQLException {
        Usuario user = new Usuario(r.getObject("id", UUID.class), r.getString("nombre"),
            r.getString("correo"), r.getString("password_hash"), Rol.valueOf(r.getString("rol")));
        if (r.getBoolean("activo")) user.activar(); else user.desactivar();
        return user;
    }
}
