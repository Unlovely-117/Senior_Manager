package infrastructure;

import domain.RepositorioProfesionales;
import domain.entities.Profesional;
import infrastructure.persistence.JdbcConnectionProvider;
import infrastructure.persistence.PersistenceException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** PostgreSQL storage for professional profiles and their optional account link. */
public final class PostgresRepositorioProfesionales implements RepositorioProfesionales {
    private static final String PROFESSIONAL_COLUMNS = "id, nombre, documento, correo, telefono, activo, especialidad, "
        + "registro_profesional, formacion, experiencia, biografia, estado_verificacion, nota_revision";
    private final JdbcConnectionProvider connections;

    public PostgresRepositorioProfesionales(JdbcConnectionProvider connections) {
        this.connections = connections;
    }

    @Override public void guardar(Profesional professional) {
        String sql = "INSERT INTO profesionales (id, nombre, documento, correo, telefono, activo, usuario_id, especialidad, "
            + "registro_profesional, formacion, experiencia, biografia, estado_verificacion) "
            + "VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM usuarios WHERE correo_normalizado = lower(trim(?)) "
            + "AND rol = 'PROFESIONAL'), ?, ?, ?, ?, ?, ?)";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, professional.getId());
            s.setString(2, professional.getNombre());
            s.setString(3, professional.getDocumento().trim());
            s.setString(4, professional.getCorreo().trim());
            s.setString(5, professional.getTelefono());
            s.setBoolean(6, professional.isActivo());
            s.setString(7, professional.getCorreo());
            s.setString(8, professional.getEspecialidad()); s.setString(9, professional.getRegistroProfesional());
            s.setString(10, professional.getFormacion()); s.setString(11, professional.getExperiencia());
            s.setString(12, professional.getBiografia()); s.setString(13, professional.getEstadoVerificacion());
            s.executeUpdate();
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo guardar la ficha profesional.", e);
        }
    }

    @Override public List<Profesional> listar() {
        String sql = "SELECT " + PROFESSIONAL_COLUMNS + " FROM profesionales ORDER BY documento_normalizado, id";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql);
                ResultSet r = s.executeQuery()) {
            List<Profesional> profiles = new ArrayList<>();
            while (r.next()) profiles.add(map(r));
            return profiles;
        } catch (SQLException e) {
            throw new PersistenceException("No se pudieron consultar las fichas profesionales.", e);
        }
    }

    @Override public Profesional buscarPorDocumento(String document) {
        if (document == null || document.isBlank()) return null;
        String sql = "SELECT " + PROFESSIONAL_COLUMNS + " FROM profesionales WHERE documento_normalizado = upper(trim(?))";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, document);
            try (ResultSet r = s.executeQuery()) { return r.next() ? map(r) : null; }
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo consultar la ficha profesional.", e);
        }
    }

    @Override public Profesional buscarPorId(UUID id) {
        if (id == null) return null;
        String sql = "SELECT " + PROFESSIONAL_COLUMNS + " FROM profesionales WHERE id = ?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, id);
            try (ResultSet r = s.executeQuery()) { return r.next() ? map(r) : null; }
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo consultar la ficha profesional.", e);
        }
    }

    @Override public Profesional buscarPorCuentaId(UUID accountId) {
        if (accountId == null) return null;
        String sql = "SELECT " + PROFESSIONAL_COLUMNS + " FROM profesionales WHERE usuario_id = ?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, accountId);
            try (ResultSet r = s.executeQuery()) { return r.next() ? map(r) : null; }
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo consultar la ficha vinculada a la cuenta.", e);
        }
    }

    @Override public boolean actualizar(Profesional professional) {
        String sql = "UPDATE profesionales SET nombre = ?, correo = ?, telefono = ?, activo = ?, especialidad = ?, "
            + "registro_profesional = ?, formacion = ?, experiencia = ?, biografia = ? WHERE id = ?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, professional.getNombre());
            s.setString(2, professional.getCorreo().trim());
            s.setString(3, professional.getTelefono());
            s.setBoolean(4, professional.isActivo());
            s.setString(5, professional.getEspecialidad()); s.setString(6, professional.getRegistroProfesional());
            s.setString(7, professional.getFormacion()); s.setString(8, professional.getExperiencia());
            s.setString(9, professional.getBiografia()); s.setObject(10, professional.getId());
            return s.executeUpdate() == 1;
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo actualizar la ficha profesional.", e);
        }
    }

    @Override public boolean vincularCuenta(String document, UUID accountId) {
        if (document == null || document.isBlank() || accountId == null) return false;
        String sql = "UPDATE profesionales p SET usuario_id = ? WHERE p.documento_normalizado = upper(trim(?)) "
            + "AND EXISTS (SELECT 1 FROM usuarios u WHERE u.id = ? AND u.rol = 'PROFESIONAL') "
            + "AND NOT EXISTS (SELECT 1 FROM profesionales other WHERE other.usuario_id = ? AND other.id <> p.id)";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, accountId);
            s.setString(2, document);
            s.setObject(3, accountId);
            s.setObject(4, accountId);
            return s.executeUpdate() == 1;
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo vincular la cuenta a la ficha profesional.", e);
        }
    }

    public void guardarFichaPropia(UUID accountId, String name, String email, boolean active, String document,
            String phone, String specialty, String license, String education, String experience, String biography) {
        String sql = "INSERT INTO profesionales (id, nombre, documento, correo, telefono, activo, usuario_id, especialidad, "
            + "registro_profesional, formacion, experiencia, biografia, estado_verificacion) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE') "
            + "ON CONFLICT (usuario_id) DO UPDATE SET nombre=EXCLUDED.nombre, documento=EXCLUDED.documento, "
            + "correo=EXCLUDED.correo, telefono=EXCLUDED.telefono, activo=EXCLUDED.activo, especialidad=EXCLUDED.especialidad, "
            + "registro_profesional=EXCLUDED.registro_profesional, formacion=EXCLUDED.formacion, experiencia=EXCLUDED.experiencia, "
            + "biografia=EXCLUDED.biografia, estado_verificacion='PENDIENTE', nota_revision=NULL, verificado_por=NULL, verificado_en=NULL";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setObject(1, UUID.randomUUID()); s.setString(2, name); s.setString(3, document.trim());
            s.setString(4, email.trim()); s.setString(5, phone); s.setBoolean(6, active); s.setObject(7, accountId);
            s.setString(8, specialty); s.setString(9, license); s.setString(10, education);
            s.setString(11, experience); s.setString(12, biography); s.executeUpdate();
        } catch (SQLException e) { throw new PersistenceException("No se pudo enviar la ficha para verificación.", e); }
    }

    public boolean revisarFicha(UUID profileId, UUID reviewerId, String status, String note) {
        String sql = "UPDATE profesionales SET estado_verificacion=?, nota_revision=?, verificado_por=?, verificado_en=CURRENT_TIMESTAMP WHERE id=?";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, status); s.setString(2, note); s.setObject(3, reviewerId); s.setObject(4, profileId);
            return s.executeUpdate() == 1;
        } catch (SQLException e) { throw new PersistenceException("No se pudo actualizar la revisión de la ficha.", e); }
    }

    @Override public boolean eliminar(String document) {
        if (document == null || document.isBlank()) return false;
        String sql = "DELETE FROM profesionales p WHERE p.documento_normalizado = upper(trim(?)) "
            + "AND NOT EXISTS (SELECT 1 FROM asignaciones_profesional_paciente a WHERE a.profesional_id = p.id)";
        try (Connection c = connections.open(); PreparedStatement s = c.prepareStatement(sql)) {
            s.setString(1, document);
            return s.executeUpdate() == 1;
        } catch (SQLException e) {
            throw new PersistenceException("No se pudo eliminar la ficha profesional.", e);
        }
    }

    private static Profesional map(ResultSet r) throws SQLException {
        Profesional profile = new Profesional(r.getObject("id", UUID.class), r.getString("nombre"),
            r.getString("documento"), r.getString("correo"), r.getString("telefono"));
        profile.setActivo(r.getBoolean("activo"));
        profile.setFichaProfesional(r.getString("especialidad"), r.getString("registro_profesional"),
            r.getString("formacion"), r.getString("experiencia"), r.getString("biografia"),
            r.getString("estado_verificacion"), r.getString("nota_revision"));
        return profile;
    }
}
