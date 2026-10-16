package domain.entities;

import java.time.LocalDate;
import java.util.UUID;

/** Generic patient history item; no clinical catalog or interpretation is imposed. */
public final class Antecedente {
    private final UUID id;
    private final UUID pacienteId;
    private final String tipo;
    private final String descripcion;
    private final LocalDate fecha;

    public Antecedente(UUID id, UUID pacienteId, String tipo, String descripcion, LocalDate fecha) {
        this.id = id == null ? UUID.randomUUID() : id;
        this.pacienteId = requiredId(pacienteId);
        this.tipo = required(tipo, "El tipo de antecedente es obligatorio.");
        this.descripcion = required(descripcion, "La descripción del antecedente es obligatoria.");
        if (fecha == null) throw new IllegalArgumentException("La fecha del antecedente es obligatoria.");
        this.fecha = fecha;
    }

    private static UUID requiredId(UUID value) {
        if (value == null) throw new IllegalArgumentException("El paciente asociado es obligatorio.");
        return value;
    }
    private static String required(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        return value.trim();
    }
    public UUID getId() { return id; }
    public UUID getPacienteId() { return pacienteId; }
    public String getTipo() { return tipo; }
    public String getDescripcion() { return descripcion; }
    public LocalDate getFecha() { return fecha; }
}
