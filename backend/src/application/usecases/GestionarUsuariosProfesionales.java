package application.usecases;

import domain.entities.Profesional;
import java.util.ArrayList;
import java.util.List;

public class GestionarUsuariosProfesionales {

    private List<Profesional> profesionales = new ArrayList<>();

    public void registrarProfesional(Profesional profesional) {
        profesionales.add(profesional);
        System.out.println("Profesional registrado correctamente.");
    }

    public List<Profesional> consultarProfesionales() {
        return profesionales;
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

