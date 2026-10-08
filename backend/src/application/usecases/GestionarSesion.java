package application.usecases;

import domain.entities.Rol;
import domain.entities.Sesion;

import java.time.Duration;

/*
Caso de uso HU-2: iniciar, consultar y cerrar la sesión activa.
También sirve de "guardia" para que otros casos de uso
exijan una sesión válida o un rol concreto.
*/

public class GestionarSesion {

    private final IniciarSesion iniciarSesion;
    private Sesion sesionActual;

    public GestionarSesion(IniciarSesion iniciarSesion) {
        this.iniciarSesion = iniciarSesion;
    }

    // Inicia sesión y la deja como sesión activa.
    public Sesion iniciarSesion(String correo, String passwordPlano) {
        if (haySesionActiva()) {
            throw new IllegalStateException(
                "Ya hay una sesión activa. Ciérrela primero.");
        }
        sesionActual = iniciarSesion.ejecutar(correo, passwordPlano);
        return sesionActual;
    }

    // Cierra la sesión de forma segura. Devuelve false si no había una activa.
    public boolean cerrarSesion() {
        if (!haySesionActiva()) {
            sesionActual = null;
            return false;
        }
        sesionActual.cerrar();
        sesionActual = null;
        return true;
    }

    // Una sesión expirada cuenta como cerrada.
    public boolean haySesionActiva() {
        return sesionActual != null && sesionActual.estaActiva();
    }

    // Devuelve la sesión activa o falla si no existe o expiró.
    public Sesion obtenerSesionActiva() {
        if (!haySesionActiva()) {
            sesionActual = null;
            throw new IllegalStateException(
                "No hay una sesión activa. Inicie sesión.");
        }
        return sesionActual;
    }

    public Duration tiempoRestante() {
        return haySesionActiva() ? sesionActual.tiempoRestante() : Duration.ZERO;
    }

    // Para operaciones de administrador (HU-3 y HU-4 podrán usarlo).
    public void exigirRol(Rol rolRequerido) {
        Sesion sesion = obtenerSesionActiva();
        if (sesion.getRol() != rolRequerido) {
            throw new SecurityException(
                "No tiene permisos para realizar esta acción.");
        }
    }
}