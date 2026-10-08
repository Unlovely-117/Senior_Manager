import application.usecases.GestionarSesion;
import application.usecases.GestionarUsuarios;
import application.usecases.IniciarSesion;
import domain.EncriptadorContrasena;
import domain.entities.Rol;
import domain.entities.Sesion;
import domain.entities.Usuario;
import infrastructure.ArchivoUsuarios;
import infrastructure.EncriptadorPBKDF2;

// Prueba por consola de HU-1 (iniciar sesión) y HU-2 (cerrar sesión).
public class PruebaIniciarSesion {

    public static void main(String[] args) {

        ArchivoUsuarios repositorio = new ArchivoUsuarios();
        EncriptadorContrasena encriptador = new EncriptadorPBKDF2();
        GestionarUsuarios usuarios = new GestionarUsuarios(repositorio);

        IniciarSesion iniciarSesion = new IniciarSesion(repositorio, encriptador);
        GestionarSesion gestionSesion = new GestionarSesion(iniciarSesion);

        String correo = "prueba.login@seniormanage.com";
        String password = "Clave123!";

        // --- Preparación: usuario con contraseña hasheada ---
        if (usuarios.buscarUsuarioPorCorreo(correo) == null) {
            usuarios.registrarUsuario(new Usuario(
                    "Usuario Prueba", correo,
                    encriptador.hashear(password), Rol.PROFESIONAL));
            System.out.println("Usuario de prueba creado.");
        }

        // --- 1. Contraseña incorrecta ---
        System.out.println("\n=== 1. Contraseña incorrecta ===");
        try {
            gestionSesion.iniciarSesion(correo, "incorrecta");
            System.out.println("ERROR: no debió permitir el acceso.");
        } catch (RuntimeException e) {
            System.out.println("Rechazado: " + e.getMessage());
        }

        // --- 2. Correo inexistente (mismo mensaje) ---
        System.out.println("\n=== 2. Correo inexistente ===");
        try {
            gestionSesion.iniciarSesion("noexiste@correo.com", password);
            System.out.println("ERROR: no debió permitir el acceso.");
        } catch (RuntimeException e) {
            System.out.println("Rechazado: " + e.getMessage());
        }

        // --- 3. Login correcto ---
        System.out.println("\n=== 3. Login correcto ===");
        Sesion sesion = gestionSesion.iniciarSesion(correo, password);
        System.out.println("Bienvenido: " + sesion.getNombre()
                + " (" + sesion.getRol() + ")");
        System.out.println("Minutos restantes: "
                + gestionSesion.tiempoRestante().toMinutes());

        // --- 4. Cerrar sesión ---
        System.out.println("\n=== 4. Cerrar sesión ===");
        System.out.println("Cerrada: " + gestionSesion.cerrarSesion());
        System.out.println("¿Sesión activa?: " + gestionSesion.haySesionActiva());

        // --- 5. Usar la sesión después de cerrarla ---
        System.out.println("\n=== 5. Acción con sesión cerrada ===");
        try {
            gestionSesion.obtenerSesionActiva();
            System.out.println("ERROR: no debió permitir la acción.");
        } catch (IllegalStateException e) {
            System.out.println("Rechazado: " + e.getMessage());
        }

        // --- 6. Bloqueo por intentos fallidos ---
        System.out.println("\n=== 6. Bloqueo tras 5 intentos fallidos ===");
        for (int i = 1; i <= 6; i++) {
            try {
                gestionSesion.iniciarSesion(correo, "mala" + i);
            } catch (RuntimeException e) {
                System.out.println("Intento " + i + ": " + e.getMessage());
            }
        }
    }
}