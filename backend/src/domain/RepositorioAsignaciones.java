package domain;

import domain.entities.AsignacionProfesionalPaciente;
import domain.entities.PaginaPacientesAsignacion;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RepositorioAsignaciones {
    Optional<AsignacionProfesionalPaciente> buscarActivaPorPaciente(UUID pacienteId);
    List<AsignacionProfesionalPaciente> listarPorPaciente(UUID pacienteId);
    boolean tieneAsignacionActiva(UUID profesionalId, UUID pacienteId);
    void reasignar(UUID pacienteId, UUID profesionalId, String profesionalEmail, LocalDate fechaInicio);
    boolean finalizar(UUID pacienteId, LocalDate fechaFin);
    PaginaPacientesAsignacion listarPacientes(String estadoPaciente, String estadoAsignacion, int page, int size);
}
