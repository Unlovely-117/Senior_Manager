import java.util.Scanner;

import application.usecases.GestionarUsuariosProfesionales;
import domain.entities.Profesional;
import infrastructure.ArchivoProfesionales;

public class PruebaGestionarUsuariosProfesionales {

    public static void main(String[] args) {

        Scanner scanner = new Scanner(System.in);

        ArchivoProfesionales repositorio = new ArchivoProfesionales();

        GestionarUsuariosProfesionales gestion =
        new GestionarUsuariosProfesionales(repositorio);

        System.out.println("=== REGISTRO DE PROFESSIONAL ===");

        System.out.print("Nombre: ");
        String nombre = scanner.nextLine();

        System.out.print("Documento: ");
        String documento = scanner.nextLine();

        System.out.print("Correo: ");
        String correo = scanner.nextLine();

        System.out.print("Telefono: ");
        String telefono = scanner.nextLine();

try {

        gestion.crearProfesional (
                nombre,
                documento,
                correo,
                telefono
        );
}catch (IllegalArgumentException e) {

    System.out.println("No se pudo registrar: " + e.getMessage());
}

        System.out.println();
        System.out.println("=== CONSULTAR PROFESSIONAL ===");

        System.out.print("Ingrese el documento: ");
        String documentoBusqueda = scanner.nextLine();

        Profesional profesional =
                gestion.buscarProfesionalPorDocumento(documentoBusqueda);

        if (profesional != null) {

            System.out.println();
            System.out.println("Professional encontrado:");
            System.out.println("Nombre: " + profesional.getNombre());
            System.out.println("Documento: " + profesional.getDocumento());
            System.out.println("Correo: " + profesional.getCorreo());
            System.out.println("Telefono: " + profesional.getTelefono());

            System.out.println(
                    "Estado: " +
                    (profesional.isActivo() ? "ACTIVO" : "INACTIVO")
            );

            System.out.println();
            System.out.println("=== MODIFICAR ESTADO ===");
            System.out.println("1. Activar");
            System.out.println("2. Desactivar");
            System.out.println("3. No modificar");

            System.out.print("Seleccione una opcion: ");
            int opcion = Integer.parseInt(scanner.nextLine());

            if (opcion == 1) {

                gestion.cambiarEstadoProfesional(
                        documentoBusqueda,
                        true
                );

            } else if (opcion == 2) {

                gestion.cambiarEstadoProfesional(
                        documentoBusqueda,
                        false
                );
            }
            
            // Consultamos nuevamente para mostrar el estado actualizado.
            profesional = gestion.buscarProfesionalPorDocumento(documentoBusqueda);

            System.out.println();
            System.out.println("=== ESTADO ACTUAL ===");
            System.out.println(
                    "Estado: " +
                    (profesional.isActivo() ? "ACTIVO" : "INACTIVO")
            );

        } else {

            System.out.println(
                    "No se encontro un professional con ese documento."
            );
        }

        scanner.close();
    }
}