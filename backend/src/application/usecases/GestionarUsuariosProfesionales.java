package application.usecases;

import domain.entities.Profesional;

public class GestionarUsuariosProfesionales {

    public void registrarProfesional(Profesional profesional) {
        System.out.println("Profesional registrado: " + profesional);
    }
     public void crearProfesional(String nombre, String documento, String correo, String telefono) {
        Profesional profesional = new Profesional(
            nombre,
            documento,
            correo,
            telefono
        );

        registrarProfesional(profesional);
    }

}


