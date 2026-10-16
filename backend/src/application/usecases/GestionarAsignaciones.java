package application.usecases;

import domain.RepositorioAsignaciones;
import domain.RepositorioPacientes;
import domain.RepositorioProfesionales;
import domain.RepositorioUsuarios;
import domain.entities.AsignacionProfesionalPaciente;
import domain.entities.Paciente;
import domain.entities.PaginaPacientesAsignacion;
import domain.entities.Profesional;
import domain.entities.Rol;
import domain.entities.Usuario;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Coordinates assignment history while leaving access decisions in the API policy. */
public final class GestionarAsignaciones {
    private final RepositorioAsignaciones assignments;
    private final RepositorioPacientes patients;
    private final RepositorioUsuarios users;
    private final RepositorioProfesionales professionals;

    public GestionarAsignaciones(RepositorioAsignaciones assignments, RepositorioPacientes patients,
            RepositorioUsuarios users, RepositorioProfesionales professionals) {
        this.assignments = assignments; this.patients = patients; this.users = users; this.professionals = professionals;
    }

    public Optional<AsignacionProfesionalPaciente> activa(UUID patientId) {
        return assignments.buscarActivaPorPaciente(patientId);
    }

    public List<AsignacionProfesionalPaciente> historial(UUID patientId) {
        if (patients.buscarPorId(patientId).isEmpty()) throw new IllegalArgumentException("Paciente no encontrado.");
        return assignments.listarPorPaciente(patientId);
    }

    public PaginaPacientesAsignacion listarPacientes(String estadoPaciente, String estadoAsignacion, int page, int size) {
        return assignments.listarPacientes(estadoPaciente, estadoAsignacion, page, size);
    }

    public boolean puedeAcceder(String professionalEmail, UUID patientId) {
        Usuario account = users.buscarPorCorreo(professionalEmail);
        if (account == null || !account.isActivo() || account.getRol() != Rol.PROFESIONAL) return false;
        Profesional profile = professionals.buscarPorCuentaId(account.getId());
        return profile != null && profile.isActivo()
            && assignments.tieneAsignacionActiva(profile.getId(), patientId);
    }

    public boolean profesionalHabilitado(String professionalEmail) {
        Usuario account = users.buscarPorCorreo(professionalEmail);
        if (account == null || !account.isActivo() || account.getRol() != Rol.PROFESIONAL) return false;
        Profesional profile = professionals.buscarPorCuentaId(account.getId());
        return profile != null && profile.isActivo();
    }

    public void reasignar(UUID patientId, String professionalEmail) {
        Paciente patient = patients.buscarPorId(patientId).orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado."));
        if (!patient.isActivo()) throw new IllegalStateException("No se puede asignar un paciente inactivo.");
        Usuario account = users.buscarPorCorreo(professionalEmail);
        if (account == null || !account.isActivo() || account.getRol() != Rol.PROFESIONAL)
            throw new IllegalArgumentException("La cuenta profesional no existe o no está activa.");
        Profesional profile = professionals.buscarPorCuentaId(account.getId());
        if (profile == null || !profile.isActivo())
            throw new IllegalArgumentException("La ficha profesional vinculada no existe o no está activa.");
        assignments.reasignar(patientId, profile.getId(), account.getCorreo(), LocalDate.now());
    }

    public boolean finalizar(UUID patientId) {
        return assignments.finalizar(patientId, LocalDate.now());
    }
}
