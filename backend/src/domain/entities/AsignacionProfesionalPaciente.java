package domain.entities;

import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

/** Historical link assigning one active professional as a patient's responsible professional. */
public final class AsignacionProfesionalPaciente {
    private final UUID id;
    private final UUID pacienteId;
    private final UUID profesionalId;
    private final String profesionalEmail;
    private final LocalDate fechaInicio;
    private final LocalDate fechaFin;

    public AsignacionProfesionalPaciente(UUID id, UUID pacienteId, String profesionalEmail,
            LocalDate fechaInicio, LocalDate fechaFin) {
        this(id, pacienteId, null, profesionalEmail, fechaInicio, fechaFin);
    }

    public AsignacionProfesionalPaciente(UUID id, UUID pacienteId, UUID profesionalId,
            String profesionalEmail, LocalDate fechaInicio, LocalDate fechaFin) {
        if (pacienteId == null) throw new IllegalArgumentException("El paciente es obligatorio.");
        if (profesionalEmail == null || profesionalEmail.isBlank()) throw new IllegalArgumentException("El profesional es obligatorio.");
        if (fechaInicio == null || (fechaFin != null && fechaFin.isBefore(fechaInicio)))
            throw new IllegalArgumentException("El periodo de asignación no es válido.");
        this.id = id == null ? UUID.randomUUID() : id;
        this.pacienteId = pacienteId;
        this.profesionalId = profesionalId;
        this.profesionalEmail = profesionalEmail.trim().toLowerCase(Locale.ROOT);
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
    }
    public UUID getId() { return id; }
    public UUID getPacienteId() { return pacienteId; }
    public UUID getProfesionalId() { return profesionalId; }
    public String getProfesionalEmail() { return profesionalEmail; }
    public LocalDate getFechaInicio() { return fechaInicio; }
    public LocalDate getFechaFin() { return fechaFin; }
    public boolean isActiva() { return fechaFin == null; }
}
