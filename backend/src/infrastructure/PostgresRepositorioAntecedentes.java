package infrastructure;

import domain.RepositorioAntecedentes;
import domain.entities.Antecedente;
import infrastructure.persistence.JdbcConnectionProvider;
import infrastructure.persistence.PersistenceException;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** PostgreSQL history adapter. FK restriction and absence of delete API preserve history links. */
public final class PostgresRepositorioAntecedentes implements RepositorioAntecedentes {
    private final JdbcConnectionProvider connections;
    public PostgresRepositorioAntecedentes(JdbcConnectionProvider connections) { this.connections = connections; }
    @Override public void guardar(Antecedente a) {
        String sql = "INSERT INTO antecedentes (id, paciente_id, tipo, descripcion, fecha) VALUES (?, ?, ?, ?, ?)";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, a.getId()); s.setObject(2, a.getPacienteId()); s.setString(3, a.getTipo());
            s.setString(4, a.getDescripcion()); s.setDate(5, Date.valueOf(a.getFecha())); s.executeUpdate();
        } catch (SQLException e) { throw new PersistenceException("No se pudo guardar el antecedente.", e); }
    }
    @Override public Optional<Antecedente> buscarPorId(UUID id) {
        String sql = "SELECT id, paciente_id, tipo, descripcion, fecha FROM antecedentes WHERE id = ?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, id); try (ResultSet r = s.executeQuery()) { return r.next() ? Optional.of(map(r)) : Optional.empty(); }
        } catch (SQLException e) { throw new PersistenceException("No se pudo consultar el antecedente.", e); }
    }
    @Override public List<Antecedente> listarPorPaciente(UUID pacienteId) {
        String sql = "SELECT id, paciente_id, tipo, descripcion, fecha FROM antecedentes WHERE paciente_id = ? ORDER BY fecha, id";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, pacienteId); try (ResultSet r = s.executeQuery()) {
                List<Antecedente> result = new ArrayList<>(); while (r.next()) result.add(map(r)); return result;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudieron consultar los antecedentes.", e); }
    }
    @Override public boolean actualizar(Antecedente a) {
        String sql = "UPDATE antecedentes SET tipo=?, descripcion=?, fecha=? WHERE id=?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, a.getTipo()); s.setString(2, a.getDescripcion()); s.setDate(3, Date.valueOf(a.getFecha()));
            s.setObject(4, a.getId()); return s.executeUpdate() == 1;
        } catch (SQLException e) { throw new PersistenceException("No se pudo actualizar el antecedente.", e); }
    }
    private static Antecedente map(ResultSet r) throws SQLException {
        return new Antecedente(r.getObject("id", UUID.class), r.getObject("paciente_id", UUID.class),
            r.getString("tipo"), r.getString("descripcion"), r.getDate("fecha").toLocalDate());
    }
}
