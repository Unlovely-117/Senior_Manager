package domain.entities;

import java.time.LocalDate;
import java.util.UUID;

/** Patient profile. Optional contact and descriptive values are represented by null. */
public final class Paciente {
    private final UUID id;
    private final String nombreCompleto;
    private final String documento;
    private final LocalDate fechaNacimiento;
    private final String telefono;
    private final String direccion;
    private final String observaciones;
    private final boolean activo;

    public Paciente(UUID id, String nombreCompleto, String documento, LocalDate fechaNacimiento,
            String telefono, String direccion, String observaciones, boolean activo) {
        this.id = id == null ? UUID.randomUUID() : id;
        this.nombreCompleto = required(nombreCompleto, "El nombre completo es obligatorio.");
        this.documento = required(documento, "El documento de identidad es obligatorio.");
        this.fechaNacimiento = fechaNacimiento;
        this.telefono = optional(telefono);
        this.direccion = optional(direccion);
        this.observaciones = optional(observaciones);
        this.activo = activo;
    }

    public static Paciente nuevo(String nombre, String documento, LocalDate nacimiento,
            String telefono, String direccion, String observaciones) {
        return new Paciente(null, nombre, documento, nacimiento, telefono, direccion, observaciones, true);
    }

    public Paciente desactivar() {
        return new Paciente(id, nombreCompleto, documento, fechaNacimiento, telefono, direccion, observaciones, false);
    }

    private static String required(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
        return value.trim();
    }

    private static String optional(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public UUID getId() { return id; }
    public String getNombreCompleto() { return nombreCompleto; }
    public String getDocumento() { return documento; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public String getTelefono() { return telefono; }
    public String getDireccion() { return direccion; }
    public String getObservaciones() { return observaciones; }
    public boolean isActivo() { return activo; }

}
