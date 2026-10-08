import java.util.Scanner;

import application.usecases.GestionarUsuariosProfesionales;

import domain.entities.Profesional;

import infrastructure.ArchivoProfesionales;

// Clase utilizada para probar las operaciones de
// GestionarUsuariosProfesionales.
// Esta clase no pertenece a la aplicación final.
// Su objetivo es comprobar que el módulo funciona correctamente.
public class PruebaGestionarUsuariosProfesionales {
        public static void main(String[] args) {

        // Scanner permite leer información desde la terminal.
        Scanner scanner = new Scanner(System.in);

        // Creamos el repositorio que guarda los profesionales
        // en el archivo correspondiente.
        ArchivoProfesionales repositorio =
                new ArchivoProfesionales();

        // Creamos el caso de uso y le entregamos el repositorio.
        GestionarUsuariosProfesionales gestion =
                new GestionarUsuariosProfesionales(repositorio);

        // =====================================================
        // REGISTRO DE PROFESIONAL
        // =====================================================

        System.out.println("=== REGISTRO DE PROFESIONAL ===");

        // Pedimos el nombre.
        System.out.print("Nombre: ");
        String nombre = scanner.nextLine();

        // Pedimos el documento.
        System.out.print("Documento: ");
        String documento = scanner.nextLine();

        // Pedimos el correo.
        System.out.print("Correo: ");
        String correo = scanner.nextLine();

        // Pedimos el teléfono.
        System.out.print("Telefono: ");
        String telefono = scanner.nextLine();

        try {

        // Intentamos crear el profesional.
        gestion.crearProfesional(
                nombre,
                documento,
                correo,
                telefono
        );

        System.out.println();
        System.out.println(
                "Profesional registrado correctamente."
        );

        } catch (IllegalArgumentException e) {

            // Mostramos el error si el registro no es válido.
        System.out.println(
                "No se pudo registrar: " + e.getMessage()
        );
}

        // =====================================================
        // CONSULTAR PROFESIONAL
        // =====================================================

        System.out.println();
        System.out.println("=== CONSULTAR PROFESIONAL ===");

        // Pedimos el documento que queremos buscar.
        System.out.print("Ingrese el documento: ");
        String documentoBusqueda = scanner.nextLine();

        // Buscamos el profesional.
        Profesional profesional =
                gestion.buscarProfesionalPorDocumento(
                        documentoBusqueda
                );

        // Comprobamos si encontramos el profesional.
        if (profesional != null) {

        System.out.println();
        System.out.println("Profesional encontrado:");

        System.out.println(
                "Nombre: " + profesional.getNombre()
        );

        System.out.println(
                "Documento: " + profesional.getDocumento()
        );

        System.out.println(
                "Correo: " + profesional.getCorreo()
        );

        System.out.println(
                "Telefono: " + profesional.getTelefono()
        );

        System.out.println(
                "Estado: " + (profesional.isActivo()? "ACTIVO": "INACTIVO")
        );

            // =================================================
            // MODIFICAR ESTADO
            // =================================================

        System.out.println();
        System.out.println("=== MODIFICAR ESTADO ===");
        System.out.println("1. Activar");
        System.out.println("2. Desactivar");
        System.out.println("3. No modificar");

            // Pedimos la opción.
        System.out.print("Seleccione una opcion: ");

        int opcion = Integer.parseInt(scanner.nextLine());

            // Activamos el profesional.
        if (opcion == 1) {

                gestion.cambiarEstadoProfesional(
                        documentoBusqueda,
                        true
                );

                System.out.println(
                        "Profesional activado."
                );

            // Desactivamos el profesional.
        } else if (opcion == 2) {

                gestion.cambiarEstadoProfesional(
                        documentoBusqueda,
                        false
                );

                System.out.println(
                        "Profesional desactivado."
                );
        }

            // Consultamos nuevamente para comprobar
            // que el cambio se haya guardado.
        profesional = gestion.buscarProfesionalPorDocumento(documentoBusqueda);

        System.out.println();
        System.out.println("=== ESTADO ACTUAL ===");

        System.out.println("Estado: " + (profesional.isActivo()? "ACTIVO": "INACTIVO")
        );

        } else {

            // Si no existe ningún profesional con ese documento.
        System.out.println(
                "No se encontro un profesional con ese documento."
        );
}

        // =====================================================
        // ELIMINAR PROFESIONAL
        // =====================================================

        System.out.println();
        System.out.println("=== ELIMINAR PROFESIONAL ===");

        // Pedimos el documento del profesional que queremos eliminar.
        System.out.print(
                "Ingrese el documento a eliminar: "
        );

        String documentoEliminar =
                scanner.nextLine();

        // Intentamos eliminar el profesional.
        boolean eliminado =
                gestion.eliminarProfesional(
                        documentoEliminar
                );

        // Mostramos el resultado.
        if (eliminado) {

        System.out.println(
                "Profesional eliminado correctamente."
        );

} else {

        System.out.println(
                "No se encontro el profesional."
        );
}

        // =====================================================
        // VERIFICAR ELIMINACIÓN
        // =====================================================

        System.out.println();
        System.out.println(
                "=== VERIFICAR ELIMINACION ==="
        );

        // Buscamos nuevamente el profesional eliminado.
        Profesional profesionalEliminado =
                gestion.buscarProfesionalPorDocumento(
                        documentoEliminar
                );

        // Si devuelve null, la eliminación fue correcta.
        if (profesionalEliminado == null) {

        System.out.println(
                "Verificacion correcta: el profesional ya no existe."
        );

} else {

            // Si todavía existe, la eliminación falló.
        System.out.println(
                "ERROR: el profesional todavia existe."
        );
}

        // Cerramos el Scanner.
        scanner.close();
        }
}