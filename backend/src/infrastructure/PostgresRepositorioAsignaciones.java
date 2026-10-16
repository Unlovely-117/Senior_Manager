package infrastructure;

import domain.RepositorioAsignaciones;
import domain.entities.AsignacionProfesionalPaciente;
import domain.entities.Paciente;
import domain.entities.PacienteAsignacionResumen;
import domain.entities.PaginaPacientesAsignacion;
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

/** PostgreSQL history of one responsible professional per patient. */
public final class PostgresRepositorioAsignaciones implements RepositorioAsignaciones {
    private final JdbcConnectionProvider connections;
    public PostgresRepositorioAsignaciones(JdbcConnectionProvider connections) { this.connections = connections; }

    @Override public Optional<AsignacionProfesionalPaciente> buscarActivaPorPaciente(UUID patientId) {
        String sql = "SELECT id, paciente_id, profesional_id, profesional_email, fecha_inicio, fecha_fin FROM asignaciones_profesional_paciente WHERE paciente_id=? AND estado='ACTIVA' AND fecha_fin IS NULL";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, patientId);
            try (ResultSet r = s.executeQuery()) { return r.next() ? Optional.of(map(r)) : Optional.empty(); }
        } catch (SQLException e) { throw new PersistenceException("No se pudo consultar la asignación.", e); }
    }

    @Override public List<AsignacionProfesionalPaciente> listarPorPaciente(UUID patientId) {
        String sql = "SELECT id, paciente_id, profesional_id, profesional_email, fecha_inicio, fecha_fin FROM asignaciones_profesional_paciente WHERE paciente_id=? ORDER BY fecha_inicio, id";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, patientId);
            try (ResultSet r = s.executeQuery()) {
                List<AsignacionProfesionalPaciente> rows = new ArrayList<>();
                while (r.next()) rows.add(map(r));
                return rows;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo consultar el historial de asignaciones.", e); }
    }

    @Override public boolean tieneAsignacionActiva(UUID professionalId, UUID patientId) {
        String sql = "SELECT 1 FROM asignaciones_profesional_paciente WHERE paciente_id=? AND profesional_id=? AND estado='ACTIVA' AND fecha_fin IS NULL";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, patientId); s.setObject(2, professionalId);
            try (ResultSet r = s.executeQuery()) { return r.next(); }
        } catch (SQLException e) { throw new PersistenceException("No se pudo validar la asignación.", e); }
    }

    @Override public void reasignar(UUID patientId, UUID professionalId, String professionalEmail, java.time.LocalDate startDate) {
        String end = "UPDATE asignaciones_profesional_paciente SET estado='FINALIZADA', fecha_fin=? WHERE paciente_id=? AND estado='ACTIVA' AND fecha_fin IS NULL";
        String add = "INSERT INTO asignaciones_profesional_paciente (id, paciente_id, profesional_id, profesional_email, estado, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, 'ACTIVA', ?, NULL)";
        try (Connection c = connections.open()) {
            c.setAutoCommit(false);
            try {
                try (PreparedStatement s = c.prepareStatement(end)) { s.setDate(1, Date.valueOf(startDate)); s.setObject(2, patientId); s.executeUpdate(); }
                try (PreparedStatement s = c.prepareStatement(add)) {
                    s.setObject(1, UUID.randomUUID()); s.setObject(2, patientId);
                    s.setObject(3, professionalId);
                    s.setString(4, professionalEmail.trim().toLowerCase(java.util.Locale.ROOT));
                    s.setDate(5, Date.valueOf(startDate)); s.executeUpdate();
                }
                c.commit();
            } catch (SQLException | RuntimeException failure) {
                try { c.rollback(); } catch (SQLException rollback) { failure.addSuppressed(rollback); }
                throw failure;
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo guardar la asignación.", e); }
    }

    @Override public boolean finalizar(UUID patientId, java.time.LocalDate endDate) {
        String sql = "UPDATE asignaciones_profesional_paciente SET estado='FINALIZADA', fecha_fin=? WHERE paciente_id=? AND estado='ACTIVA' AND fecha_fin IS NULL";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setDate(1, Date.valueOf(endDate)); s.setObject(2, patientId); return s.executeUpdate() == 1;
        } catch (SQLException e) { throw new PersistenceException("No se pudo finalizar la asignación.", e); }
    }

    @Override public PaginaPacientesAsignacion listarPacientes(String estadoPaciente, String estadoAsignacion, int page, int size) {
        long offset = Math.multiplyExact((long) page, (long) size);
        String patientCondition = "(? = 'TODOS' OR (? = 'ACTIVO' AND p.activo = TRUE) OR (? = 'INACTIVO' AND p.activo = FALSE))";
        String assignmentCondition = "(? = 'TODAS' OR (? = 'ACTIVA' AND EXISTS (SELECT 1 FROM asignaciones_profesional_paciente ax WHERE ax.paciente_id=p.id AND ax.estado='ACTIVA' AND ax.fecha_fin IS NULL)) OR (? = 'FINALIZADA' AND EXISTS (SELECT 1 FROM asignaciones_profesional_paciente af WHERE af.paciente_id=p.id) AND NOT EXISTS (SELECT 1 FROM asignaciones_profesional_paciente aa WHERE aa.paciente_id=p.id AND aa.estado='ACTIVA' AND aa.fecha_fin IS NULL)) OR (? = 'SIN_ASIGNACION' AND NOT EXISTS (SELECT 1 FROM asignaciones_profesional_paciente an WHERE an.paciente_id=p.id)))";
        String countSql = "SELECT count(*) FROM pacientes p WHERE " + patientCondition + " AND " + assignmentCondition;
        String rowsSql = "SELECT p.id, p.nombre_completo, p.documento, p.activo, "
            + "a.id AS asignacion_id, a.profesional_id, a.profesional_email, a.fecha_inicio, a.fecha_fin "
            + "FROM pacientes p LEFT JOIN LATERAL (SELECT id, profesional_id, profesional_email, fecha_inicio, fecha_fin, estado FROM asignaciones_profesional_paciente x WHERE x.paciente_id=p.id "
            + "ORDER BY CASE WHEN x.estado='ACTIVA' AND x.fecha_fin IS NULL THEN 0 ELSE 1 END, x.fecha_inicio DESC, x.id DESC LIMIT 1) a ON TRUE "
            + "WHERE " + patientCondition + " AND " + assignmentCondition + " ORDER BY p.nombre_completo, p.id LIMIT ? OFFSET ?";
        try (Connection c = connections.open()) {
            long total;
            try (PreparedStatement count = c.prepareStatement(countSql)) {
                bindFilters(count, estadoPaciente, estadoAsignacion);
                try (ResultSet r = count.executeQuery()) { r.next(); total = r.getLong(1); }
            }
            List<PacienteAsignacionResumen> items = new ArrayList<>();
            try (PreparedStatement rows = c.prepareStatement(rowsSql)) {
                bindFilters(rows, estadoPaciente, estadoAsignacion);
                rows.setInt(8, size);
                rows.setLong(9, offset);
                try (ResultSet r = rows.executeQuery()) {
                    while (r.next()) {
                        Paciente patient = new Paciente(r.getObject("id", UUID.class), r.getString("nombre_completo"), r.getString("documento"),
                            null, null, null, null, r.getBoolean("activo"));
                        UUID assignmentId = r.getObject("asignacion_id", UUID.class);
                        AsignacionProfesionalPaciente last = null;
                        if (assignmentId != null) {
                            Date end = r.getDate("fecha_fin");
                            last = new AsignacionProfesionalPaciente(assignmentId, patient.getId(),
                                r.getObject("profesional_id", UUID.class), r.getString("profesional_email"),
                                r.getDate("fecha_inicio").toLocalDate(), end == null ? null : end.toLocalDate());
                        }
                        items.add(new PacienteAsignacionResumen(patient, last));
                    }
                }
            }
            return new PaginaPacientesAsignacion(items, page, size, total);
        } catch (SQLException e) { throw new PersistenceException("No se pudo consultar la lista administrativa de asignaciones.", e); }
    }

    private static void bindFilters(PreparedStatement statement, String estadoPaciente, String estadoAsignacion) throws SQLException {
        statement.setString(1, estadoPaciente); statement.setString(2, estadoPaciente); statement.setString(3, estadoPaciente);
        statement.setString(4, estadoAsignacion); statement.setString(5, estadoAsignacion); statement.setString(6, estadoAsignacion); statement.setString(7, estadoAsignacion);
    }

    private static AsignacionProfesionalPaciente map(ResultSet r) throws SQLException {
        Date end = r.getDate("fecha_fin");
        return new AsignacionProfesionalPaciente(r.getObject("id", UUID.class), r.getObject("paciente_id", UUID.class),
            r.getObject("profesional_id", UUID.class), r.getString("profesional_email"),
            r.getDate("fecha_inicio").toLocalDate(), end == null ? null : end.toLocalDate());
    }
}
