package infrastructure;

import domain.RepositorioSesiones;
import infrastructure.persistence.JdbcConnectionProvider;
import infrastructure.persistence.PersistenceException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

/** Persistent server-side session status enables logout and account-wide revocation across restarts. */
public final class PostgresRepositorioSesiones implements RepositorioSesiones {
    private final JdbcConnectionProvider connections;
    public PostgresRepositorioSesiones(JdbcConnectionProvider connections) { this.connections = connections; }

    @Override public void registrar(UUID tokenId, String email, Instant expiresAt) {
        String sql = "INSERT INTO sesiones (jti, correo, expira_en, revocada_en) VALUES (?, ?, ?, NULL)";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, tokenId); s.setString(2, email.trim().toLowerCase(java.util.Locale.ROOT));
            s.setTimestamp(3, Timestamp.from(expiresAt)); s.executeUpdate();
        } catch (SQLException e) { throw new PersistenceException("No se pudo registrar la sesión.", e); }
    }

    @Override public boolean estaActiva(UUID tokenId, String email, Instant now) {
        String sql = "SELECT 1 FROM sesiones WHERE jti=? AND correo=? AND revocada_en IS NULL AND expira_en>?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, tokenId); s.setString(2, email.trim().toLowerCase(java.util.Locale.ROOT)); s.setTimestamp(3, Timestamp.from(now));
            try (ResultSet r = s.executeQuery()) { return r.next(); }
        } catch (SQLException e) { throw new PersistenceException("No se pudo validar la sesión.", e); }
    }

    @Override public void revocar(UUID tokenId) { update("UPDATE sesiones SET revocada_en=? WHERE jti=? AND revocada_en IS NULL", tokenId); }

    @Override public void revocarOtras(String email, UUID keep) {
        String sql = "UPDATE sesiones SET revocada_en=? WHERE correo=? AND jti<>? AND revocada_en IS NULL";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setTimestamp(1, Timestamp.from(Instant.now())); s.setString(2, email.trim().toLowerCase(java.util.Locale.ROOT)); s.setObject(3, keep); s.executeUpdate();
        } catch (SQLException e) { throw new PersistenceException("No se pudieron revocar las sesiones anteriores.", e); }
    }

    @Override public void revocarTodas(String email) {
        String sql = "UPDATE sesiones SET revocada_en=? WHERE correo=? AND revocada_en IS NULL";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setTimestamp(1, Timestamp.from(Instant.now())); s.setString(2, email.trim().toLowerCase(java.util.Locale.ROOT)); s.executeUpdate();
        } catch (SQLException e) { throw new PersistenceException("No se pudieron revocar las sesiones.", e); }
    }

    private void update(String sql, UUID tokenId) {
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setTimestamp(1, Timestamp.from(Instant.now())); s.setObject(2, tokenId); s.executeUpdate();
        } catch (SQLException e) { throw new PersistenceException("No se pudo revocar la sesión.", e); }
    }
}
