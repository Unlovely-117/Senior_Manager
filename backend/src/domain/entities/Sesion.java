package domain.entities;

import java.time.Duration;
import java.time.Instant;

// Representa a un usuario autenticado durante un tiempo limitado.
public class Sesion {

    private final String correo;
    private final String nombre;
    private final Rol rol;
    private final Instant inicio;
    private final Instant expiracion;
    private boolean cerrada;

    public Sesion(Usuario usuario, Duration duracion) {
        if (usuario == null) {
            throw new IllegalArgumentException("El usuario es obligatorio.");
        }
        if (duracion == null || duracion.isZero() || duracion.isNegative()) {
            throw new IllegalArgumentException("La duración debe ser positiva.");
        }

        this.correo = usuario.getCorreo();
        this.nombre = usuario.getNombre();
        this.rol = usuario.getRol();
        this.inicio = Instant.now();
        this.expiracion = inicio.plus(duracion);
        this.cerrada = false;
    }

    // Una sesión expirada se considera inactiva, igual que una cerrada.
    public boolean estaActiva() {
        return !cerrada && Instant.now().isBefore(expiracion);
    }

    public void cerrar() {
        this.cerrada = true;
    }

    public Duration tiempoRestante() {
        if (!estaActiva()) {
            return Duration.ZERO;
        }
        return Duration.between(Instant.now(), expiracion);
    }

    public String getCorreo() { return correo; }
    public String getNombre() { return nombre; }
    public Rol getRol() { return rol; }
    public Instant getInicio() { return inicio; }
    public Instant getExpiracion() { return expiracion; }
}