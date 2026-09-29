package application.usecases;
// Indica que esta clase está dentro del paquete de casos de uso.
import domain.entities.Profesional;
// Permite usar la clase Profesional.
import java.util.ArrayList;
// Permite crear una lista que pueda guardar varios profesionales.
import java.util.List;
//Define que vamos a trabajar con una lista de profesionales.

public class GestionarUsuariosProfesionales {
//Clase encargada de las operaciones para gestionar profesionales.

    private List<Profesional> profesionales = new ArrayList<>();
    // Crea una lista vacía donde guardaremos los profesionales.
    // List = tipo de colección.
    // Profesional = tipo de dato que guardará.
    // ArrayList = la lista que estamos usando.

    public void registrarProfesional(Profesional profesional) { //recibe P ,lo agraga una lista y si queda correctamente
        profesionales.add(profesional);
        System.out.println("Profesional registrado correctamente.");
    }

    public List<Profesional> consultarProfesionales() { //permite consultar y devuelve lo q este guardado
        return profesionales;
    }

    //recibe los datospara crear P, crea el objeto con esos dat 
    public void crearProfesional(String nombre, String documento, String correo, String telefono) {
        Profesional profesional = new Profesional(
            nombre,
            documento,
            correo,
            telefono
        );

        registrarProfesional(profesional);
        // envía el P creado al método que lo guarda en la lista
    }
    public boolean editarProfesional(String documento, String nuevoNombre, String nuevoCorreo, String nuevoTelefono) {
        // Busca un profesional por su documento para modificar sus datos.

        for (Profesional profesional : profesionales) {
            // Recorre todos los profesionales de la lista.

            if (profesional.getDocumento().equals(documento)) {
                // Comprueba si el documento coincide.

                profesional.setNombre(nuevoNombre); //actualiza los dat
                
                profesional.setCorreo(nuevoCorreo);
                
                profesional.setTelefono(nuevoTelefono);

                return true;
                // Indica que el profesional fue encontrado y editado.
            }
        }

        return false;
        // Indica que no se encontró el profesional.
    }
}
// contiene operaciones relacionadas como el resgistroP y consultaP
