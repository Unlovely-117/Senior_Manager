package application.usecases;

import domain.EncriptadorContrasena;
import domain.RepositorioUsuarios;
import domain.entities.Sesion;
import domain.entities.Usuario;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

// Caso de uso HU-1: validar credenciales y crear una sesión.
public class IniciarSesion {

    private static final String CREDENCIALES_INVALIDAS = "Credenciales inválidas.";
    private static final int MAX_INTENTOS = 5;
    private static final Duration TIEMPO_BLOQUEO = Duration.ofMinutes(5);
    private static final Duration DURACION_SESION = Duration.ofHours(8);

    // Lleva la cuenta de intentos fallidos por correo.
    private static class Intentos {
        int fallidos = 0;
        Instant bloqueadoHasta = null;
    }

    private final RepositorioUsuarios repositorio;
    private final EncriptadorContrasena encriptador;
    private final Map<String, Intentos> intentos = new HashMap<>();

    public IniciarSesion(RepositorioUsuarios repositorio,
                         EncriptadorContrasena encriptador) {
        this.repositorio = repositorio;
        this.encriptador = encriptador;
    }

    public Sesion ejecutar(String correo, String passwordPlano) {

        if (correo == null || correo.isBlank()
                || passwordPlano == null || passwordPlano.isBlank()) {
            throw new IllegalArgumentException(
                "El correo y la contraseña son obligatorios.");
        }

        String clave = correo.trim().toLowerCase();
        Intentos registro = intentos.computeIfAbsent(clave, k -> new Intentos());

        // Si la cuenta está bloqueada, ni siquiera revisamos credenciales.
        if (registro.bloqueadoHasta != null) {
            if (Instant.now().isBefore(registro.bloqueadoHasta)) {
                long minutos = Math.max(1,
        (Duration.between(Instant.now(), registro.bloqueadoHasta).getSeconds() + 59) / 60);
                throw new IllegalStateException(
                    "Demasiados intentos fallidos. Intente de nuevo en "
                    + minutos + " minuto(s).");
            }
            // El bloqueo ya terminó: empezamos de cero.
            registro.bloqueadoHasta = null;
            registro.fallidos = 0;
        }

        Usuario usuario = repositorio.buscarPorCorreo(correo.trim());

        /* 
        Mismo error si el correo no existe, la cuenta está inactiva
        o la contraseña es incorrecta: así no revelamos qué correos existen.
        */
       
        boolean valido = usuario != null
                && usuario.isActivo()
                && encriptador.verificar(passwordPlano, usuario.getPasswordHash());

        if (!valido) {
            registro.fallidos++;
            if (registro.fallidos >= MAX_INTENTOS) {
                registro.bloqueadoHasta = Instant.now().plus(TIEMPO_BLOQUEO);
            }
            throw new IllegalArgumentException(CREDENCIALES_INVALIDAS);
        }

        // Login correcto: se limpia el contador y se crea la sesión.
        intentos.remove(clave);
        return new Sesion(usuario, DURACION_SESION);
    }
}