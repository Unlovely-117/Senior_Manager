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
        validarDatosRegistro(nombre, documento, nacimiento, telefono, direccion, observaciones);
        return new Paciente(null, nombre, documento, nacimiento, telefono, direccion, observaciones, true);
    }

    public static void validarDatosRegistro(String nombreCompleto, String documento, LocalDate fechaNacimiento,
            String telefono, String direccion, String observaciones) {
        String nombre = required(nombreCompleto, "El nombre completo es obligatorio.");
        if (nombre.length() < 3 || nombre.length() > 120) {
            throw new IllegalArgumentException("El nombre completo debe tener entre 3 y 120 caracteres.");
        }
        String doc = required(documento, "El documento de identidad es obligatorio.");
        if (!doc.matches("^\\d{6,10}$")) {
            throw new IllegalArgumentException("El documento de identidad (cédula) debe contener solo números entre 6 y 10 dígitos.");
        }
        if (fechaNacimiento == null) {
            throw new IllegalArgumentException("La fecha de nacimiento es obligatoria.");
        }
        LocalDate hoy = LocalDate.now();
        if (fechaNacimiento.isAfter(hoy)) {
            throw new IllegalArgumentException("La fecha de nacimiento no puede ser una fecha futura.");
        }
        if (fechaNacimiento.isAfter(hoy.minusYears(60))) {
            throw new IllegalArgumentException("El paciente debe ser un adulto mayor (mínimo 60 años de edad).");
        }
        if (fechaNacimiento.isBefore(hoy.minusYears(120))) {
            throw new IllegalArgumentException("La fecha de nacimiento excede el rango máximo permitido (120 años).");
        }
        if (telefono == null || telefono.isBlank()) {
            throw new IllegalArgumentException("El número de teléfono es obligatorio.");
        }
        String tel = telefono.trim();
        if (!tel.matches("^\\d{7,10}$")) {
            throw new IllegalArgumentException("El número de teléfono debe contener solo números (entre 7 y 10 dígitos).");
        }
        String dir = optional(direccion);
        if (dir != null && dir.length() > 200) {
            throw new IllegalArgumentException("La dirección no puede superar 200 caracteres.");
        }
        String obs = optional(observaciones);
        if (obs != null && obs.length() > 2000) {
            throw new IllegalArgumentException("Las observaciones no pueden superar 2000 caracteres.");
        }
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
