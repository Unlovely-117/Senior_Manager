package domain;

import domain.entities.Paciente;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RepositorioPacientes {
    void guardar(Paciente paciente);
    Optional<Paciente> buscarPorId(UUID id);
    Optional<Paciente> buscarPorDocumento(String documento);
    List<Paciente> listar();
    List<Paciente> listarActivos();
    List<Paciente> listarInactivos();
    List<Paciente> listarActivosAsignadosA(String profesionalEmail);
    List<Paciente> listarInactivosAsignadosA(String profesionalEmail);
    boolean actualizar(Paciente paciente);
    boolean desactivar(UUID id);
}
