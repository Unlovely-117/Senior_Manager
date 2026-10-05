import java.util.List;
import java.util.Scanner;

import application.usecases.GestionarUsuarios;
import domain.entities.Rol;
import domain.entities.Usuario;
import infrastructure.ArchivoUsuarios;

// Clase utilizada para probar las operaciones de GestionarUsuarios.
// Esta clase no pertenece a la aplicación final.
// Su objetivo es comprobar que el módulo funciona correctamente.
public class PruebaGestionarUsuarios {

    public static void main(String[] args) {

        // Scanner permite leer información desde la terminal.
        Scanner scanner = new Scanner(System.in);

        // Creamos el repositorio que se encargará de guardar
        // y consultar los usuarios en el archivo TXT.
        ArchivoUsuarios repositorio = new ArchivoUsuarios();

        // Creamos el caso de uso y le entregamos el repositorio.
        GestionarUsuarios gestion =
                new GestionarUsuarios(repositorio);

        // =====================================================
        // REGISTRO
        // =====================================================

        System.out.println("=== REGISTRO DE USUARIO ===");

        // Pedimos el nombre.
        System.out.print("Nombre: ");
        String nombre = scanner.nextLine();

        // Pedimos el correo.
        System.out.print("Correo: ");
        String correo = scanner.nextLine();

        // Por ahora utilizamos un texto de prueba.
        // Más adelante implementaremos almacenamiento seguro
        // mediante hash de contraseña.
        System.out.print("contraseña de prueba: ");
        String password = scanner.nextLine();

        // Mostramos los roles disponibles.
        System.out.println("Seleccione el rol:");
        System.out.println("1. Administrador");
        System.out.println("2. Profesional");

        // Leemos la opción seleccionada.
        System.out.print("Opcion: ");
        int opcionRol = Integer.parseInt(scanner.nextLine());

        // Por defecto utilizamos el rol profesional.
        Rol rol = Rol.PROFESIONAL;

        // Si selecciona 1, asignamos administrador.
        if (opcionRol == 1) {
            rol = Rol.ADMINISTRADOR;
        }

        // Creamos el objeto Usuario.
        Usuario usuario = new Usuario(
                nombre,
                correo,
                password,
                rol
        );

        try {

            // Intentamos registrar el usuario.
            gestion.registrarUsuario(usuario);

            System.out.println();
            System.out.println("Usuario registrado correctamente.");

        } catch (IllegalArgumentException e) {

            // Si existe un correo duplicado u ocurre
            // otra validación, mostramos el error.
            System.out.println();
            System.out.println(
                    "No se pudo registrar: " + e.getMessage()
            );
        }

        // =====================================================
        // LISTAR USUARIOS
        // =====================================================

        System.out.println();
        System.out.println("=== USUARIOS REGISTRADOS ===");

        // Obtenemos todos los usuarios.
        List<Usuario> usuarios = gestion.listarUsuarios();

        // Recorremos la lista.
        for (Usuario actual : usuarios) {

            System.out.println("----------------------------");
            System.out.println("Nombre: " + actual.getNombre());
            System.out.println("Correo: " + actual.getCorreo());
            System.out.println("Rol: " + actual.getRol());

            // Mostramos si la cuenta está activa o inactiva.
            System.out.println(
                    "Estado: " +
                    (actual.isActivo() ? "ACTIVO" : "INACTIVO")
            );
        }

        // =====================================================
        // CONSULTAR USUARIO
        // =====================================================

        System.out.println();
        System.out.println("=== CONSULTAR USUARIO ===");

        // Pedimos el correo que queremos buscar.
        System.out.print("Ingrese el correo: ");
        String correoBusqueda = scanner.nextLine();

        // Buscamos el usuario.
        Usuario encontrado =
                gestion.buscarUsuarioPorCorreo(correoBusqueda);

        // Comprobamos si encontramos el usuario.
        if (encontrado != null) {

            System.out.println();
            System.out.println("Usuario encontrado:");
            System.out.println("Nombre: " + encontrado.getNombre());
            System.out.println("Correo: " + encontrado.getCorreo());
            System.out.println("Rol: " + encontrado.getRol());

            System.out.println(
                    "Estado: " +
                    (encontrado.isActivo()
                            ? "ACTIVO"
                            : "INACTIVO")
            );

            // =================================================
            // CAMBIAR ESTADO
            // =================================================

            System.out.println();
            System.out.println("=== CAMBIAR ESTADO ===");
            System.out.println("1. Activar");
            System.out.println("2. Desactivar");
            System.out.println("3. No modificar");

            // Pedimos la opción.
            System.out.print("Seleccione una opcion: ");
            int opcionEstado =
                    Integer.parseInt(scanner.nextLine());

            // Activamos el usuario.
            if (opcionEstado == 1) {

                boolean resultado =
                        gestion.activarUsuario(correoBusqueda);

                if (resultado) {
                    System.out.println("Usuario activado.");
                }

            // Desactivamos el usuario.
            } else if (opcionEstado == 2) {

                boolean resultado =
                        gestion.desactivarUsuario(correoBusqueda);

                if (resultado) {
                    System.out.println("Usuario desactivado.");
                }
            }

            // Volvemos a consultar el usuario para comprobar
            // que el cambio realmente se guardó.
            encontrado =
                    gestion.buscarUsuarioPorCorreo(correoBusqueda);

            System.out.println();
            System.out.println(
                    "Estado actual: " +
                    (encontrado.isActivo()
                            ? "ACTIVO"
                            : "INACTIVO")
            );

        } else {

            // Si no existe ningún usuario con ese correo.
            System.out.println(
                    "No se encontro un usuario con ese correo."
            );
        }

        // Cerramos el Scanner.
        scanner.close();
    }
}