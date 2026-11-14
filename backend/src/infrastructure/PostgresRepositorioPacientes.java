package infrastructure;

import domain.RepositorioPacientes;
import domain.entities.Paciente;
import infrastructure.persistence.DocumentoPacienteDuplicadoException;
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

/** PostgreSQL patient adapter, lazily used by the API after external DB configuration. */
public final class PostgresRepositorioPacientes implements RepositorioPacientes {
    private final JdbcConnectionProvider connections;
    public PostgresRepositorioPacientes(JdbcConnectionProvider connections) { this.connections = connections; }

    @Override public void guardar(Paciente p) {
        String sql = "INSERT INTO pacientes (id, nombre_completo, documento, fecha_nacimiento, telefono, direccion, observaciones, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            bind(s, p); s.executeUpdate();
        } catch (SQLException e) { throw persistenceFailure(e, true); }
    }
    @Override public Optional<Paciente> buscarPorId(UUID id) {
        return one("SELECT id, nombre_completo, documento, fecha_nacimiento, telefono, direccion, observaciones, activo FROM pacientes WHERE id = ?", id);
    }
    @Override public Optional<Paciente> buscarPorDocumento(String documento) {
        String normalizedInput = documento == null ? "" : documento.trim();
        return one("SELECT id, nombre_completo, documento, fecha_nacimiento, telefono, direccion, observaciones, activo FROM pacientes WHERE documento_normalizado = upper(trim(?))", normalizedInput);
    }
    private Optional<Paciente> one(String sql, Object key) {
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, key);
            try (ResultSet r = s.executeQuery()) { return r.next() ? Optional.of(map(r)) : Optional.empty(); }
        } catch (SQLException e) { throw new PersistenceException("No se pudo consultar el paciente.", e); }
    }
    @Override public List<Paciente> listar() {
        String sql = "SELECT id, nombre_completo, documento, fecha_nacimiento, telefono, direccion, observaciones, activo FROM pacientes ORDER BY nombre_completo, id";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql); ResultSet r = s.executeQuery()) {
            List<Paciente> result = new ArrayList<>(); while (r.next()) result.add(map(r)); return result;
        } catch (SQLException e) { throw new PersistenceException("No se pudieron consultar los pacientes.", e); }
    }
    @Override public List<Paciente> listarActivos() { return listarPorEstado(true); }
    @Override public List<Paciente> listarInactivos() { return listarPorEstado(false); }
    private List<Paciente> listarPorEstado(boolean activo) {
        String sql = "SELECT id, nombre_completo, documento, fecha_nacimiento, telefono, direccion, observaciones, activo FROM pacientes WHERE activo = ? ORDER BY nombre_completo, id";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setBoolean(1, activo);
            try (ResultSet r = s.executeQuery()) {
                List<Paciente> result = new ArrayList<>(); while (r.next()) result.add(map(r)); return result;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudieron consultar los pacientes.", e); }
    }
    @Override public List<Paciente> listarActivosAsignadosA(String profesionalEmail) {
        String sql = "SELECT DISTINCT p.id, p.nombre_completo, p.documento, p.fecha_nacimiento, p.telefono, p.direccion, p.observaciones, p.activo "
            + "FROM pacientes p JOIN asignaciones_profesional_paciente a ON a.paciente_id = p.id "
            + "JOIN profesionales pr ON pr.id = a.profesional_id JOIN usuarios u ON u.id = pr.usuario_id "
            + "WHERE p.activo = TRUE AND u.correo_normalizado = lower(trim(?)) AND u.rol = 'PROFESIONAL' AND u.activo = TRUE AND pr.activo = TRUE AND a.estado = 'ACTIVA' AND a.fecha_fin IS NULL "
            + "ORDER BY p.nombre_completo, p.id";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, profesionalEmail.trim().toLowerCase(java.util.Locale.ROOT));
            try (ResultSet r = s.executeQuery()) {
                List<Paciente> result = new ArrayList<>(); while (r.next()) result.add(map(r)); return result;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudieron consultar los pacientes asignados.", e); }
    }
    @Override public List<Paciente> listarInactivosAsignadosA(String profesionalEmail) {
        String sql = "SELECT DISTINCT p.id, p.nombre_completo, p.documento, p.fecha_nacimiento, p.telefono, p.direccion, p.observaciones, p.activo "
            + "FROM pacientes p JOIN asignaciones_profesional_paciente a ON a.paciente_id = p.id "
            + "JOIN profesionales pr ON pr.id = a.profesional_id JOIN usuarios u ON u.id = pr.usuario_id "
            + "WHERE p.activo = FALSE AND u.correo_normalizado = lower(trim(?)) AND u.rol = 'PROFESIONAL' AND u.activo = TRUE AND pr.activo = TRUE AND a.estado = 'ACTIVA' AND a.fecha_fin IS NULL "
            + "ORDER BY p.nombre_completo, p.id";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, profesionalEmail.trim().toLowerCase(java.util.Locale.ROOT));
            try (ResultSet r = s.executeQuery()) {
                List<Paciente> result = new ArrayList<>(); while (r.next()) result.add(map(r)); return result;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudieron consultar los pacientes historicos asignados.", e); }
    }
    @Override public boolean actualizar(Paciente p) {
        String sql = "UPDATE pacientes SET nombre_completo=?, documento=?, fecha_nacimiento=?, telefono=?, direccion=?, observaciones=?, activo=? WHERE id=?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, p.getNombreCompleto()); s.setString(2, p.getDocumento());
            if (p.getFechaNacimiento() == null) s.setNull(3, java.sql.Types.DATE); else s.setDate(3, Date.valueOf(p.getFechaNacimiento()));
            s.setString(4, p.getTelefono()); s.setString(5, p.getDireccion()); s.setString(6, p.getObservaciones());
            s.setBoolean(7, p.isActivo()); s.setObject(8, p.getId()); return s.executeUpdate() == 1;
        } catch (SQLException e) { throw persistenceFailure(e, true); }
    }
    @Override public boolean desactivar(UUID id) {
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement("UPDATE pacientes SET activo = FALSE WHERE id = ? AND activo = TRUE")) {
            s.setObject(1, id); return s.executeUpdate() == 1;
        } catch (SQLException e) { throw new PersistenceException("No se pudo desactivar el paciente.", e); }
    }
    private static void bind(PreparedStatement s, Paciente p) throws SQLException {
        s.setObject(1, p.getId()); s.setString(2, p.getNombreCompleto()); s.setString(3, p.getDocumento());
        if (p.getFechaNacimiento() == null) s.setNull(4, java.sql.Types.DATE); else s.setDate(4, Date.valueOf(p.getFechaNacimiento()));
        s.setString(5, p.getTelefono()); s.setString(6, p.getDireccion()); s.setString(7, p.getObservaciones()); s.setBoolean(8, p.isActivo());
    }
    private static Paciente map(ResultSet r) throws SQLException {
        Date date = r.getDate("fecha_nacimiento");
        return new Paciente(r.getObject("id", UUID.class), r.getString("nombre_completo"), r.getString("documento"),
            date == null ? null : date.toLocalDate(), r.getString("telefono"), r.getString("direccion"),
            r.getString("observaciones"), r.getBoolean("activo"));
    }
    private static RuntimeException persistenceFailure(SQLException e, boolean duplicatePossible) {
        if (duplicatePossible && "23505".equals(e.getSQLState())) return new DocumentoPacienteDuplicadoException();
        return new PersistenceException("No se pudo guardar el paciente.", e);
    }
}
