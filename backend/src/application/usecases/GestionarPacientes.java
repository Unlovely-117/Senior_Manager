package application.usecases;

import domain.RepositorioPacientes;
import domain.entities.Paciente;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public final class GestionarPacientes {
    private final RepositorioPacientes repositorio;
    public GestionarPacientes(RepositorioPacientes repositorio) { this.repositorio = repositorio; }

    public Paciente registrar(String nombre, String documento, LocalDate nacimiento,
            String telefono, String direccion, String observaciones) {
        Paciente paciente = Paciente.nuevo(nombre, documento, nacimiento, telefono, direccion, observaciones);
        if (repositorio.buscarPorDocumento(paciente.getDocumento()).isPresent()) {
            throw new IllegalStateException("Ya existe un paciente con ese documento.");
        }
        repositorio.guardar(paciente);
        return paciente;
    }
    public Optional<Paciente> buscar(UUID id) { return repositorio.buscarPorId(id); }
    public List<Paciente> listar() { return repositorio.listarActivos(); }
    public List<Paciente> listarHistoricos() { return repositorio.listarInactivos(); }
    public List<Paciente> listarAsignados(String profesionalEmail) { return repositorio.listarActivosAsignadosA(profesionalEmail); }
    public List<Paciente> listarHistoricosAsignados(String profesionalEmail) { return repositorio.listarInactivosAsignadosA(profesionalEmail); }
    public boolean actualizar(UUID id, String nombre, String documento, LocalDate nacimiento,
            String telefono, String direccion, String observaciones) {
        Paciente actual = repositorio.buscarPorId(id).orElse(null);
        if (actual == null) return false;
        if (!actual.isActivo()) throw new IllegalStateException("No se puede actualizar un paciente inactivo.");
        Paciente duplicado = repositorio.buscarPorDocumento(documento == null ? "" : documento.trim()).orElse(null);
        if (duplicado != null && !duplicado.getId().equals(id)) {
            throw new IllegalStateException("Ya existe un paciente con ese documento.");
        }
        Paciente actualizado = new Paciente(id, nombre, documento, nacimiento, telefono, direccion,
            observaciones, actual.isActivo());
        return repositorio.actualizar(actualizado);
    }
    public boolean desactivar(UUID id) { return repositorio.desactivar(id); }
}
