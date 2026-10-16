package application.usecases;

import domain.RepositorioAntecedentes;
import domain.RepositorioPacientes;
import domain.entities.Antecedente;
import domain.entities.Paciente;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public final class GestionarAntecedentes {
    private final RepositorioAntecedentes antecedentes;
    private final RepositorioPacientes pacientes;
    public GestionarAntecedentes(RepositorioAntecedentes antecedentes, RepositorioPacientes pacientes) {
        this.antecedentes = antecedentes; this.pacientes = pacientes;
    }
    public Antecedente registrar(UUID pacienteId, String tipo, String descripcion, LocalDate fecha) {
        Paciente paciente = pacientes.buscarPorId(pacienteId).orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado."));
        if (!paciente.isActivo()) throw new IllegalStateException("No se pueden agregar antecedentes a un paciente inactivo.");
        Antecedente item = new Antecedente(null, pacienteId, tipo, descripcion, fecha);
        antecedentes.guardar(item);
        return item;
    }
    public Optional<Antecedente> buscar(UUID id) { return antecedentes.buscarPorId(id); }
    public List<Antecedente> listarPorPaciente(UUID pacienteId) {
        if (pacientes.buscarPorId(pacienteId).isEmpty()) throw new IllegalArgumentException("Paciente no encontrado.");
        return antecedentes.listarPorPaciente(pacienteId);
    }
    public boolean actualizar(UUID id, String tipo, String descripcion, LocalDate fecha) {
        Antecedente actual = antecedentes.buscarPorId(id).orElse(null);
        if (actual == null) return false;
        Paciente paciente = pacientes.buscarPorId(actual.getPacienteId()).orElse(null);
        if (paciente == null) return false;
        if (!paciente.isActivo()) throw new IllegalStateException("No se pueden actualizar antecedentes de un paciente inactivo.");
        return antecedentes.actualizar(new Antecedente(id, actual.getPacienteId(), tipo, descripcion, fecha));
    }
}
