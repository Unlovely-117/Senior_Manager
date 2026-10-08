
package application.usecases;

import domain.RepositorioProfesionales;
import domain.entities.Profesional;
import java.util.List;

// Coordina las operaciones para gestionar profesionales.
public class GestionarUsuariosProfesionales {

    private final RepositorioProfesionales repositorio;

    // Recibe el mecanismo encargado de guardar los profesionales. (nuestro consturctor)
    public GestionarUsuariosProfesionales(RepositorioProfesionales repositorio) {
        this.repositorio = repositorio;
    }

    // Registra un profesional si su documento no existe.
    public void registrarProfesional(Profesional profesional) {

        if (profesional == null || profesional.getDocumento() == null
                || profesional.getDocumento().isBlank()) {
            throw new IllegalArgumentException("Los datos del profesional son inválidos.");
        }

        if (buscarProfesionalPorDocumento(profesional.getDocumento()) != null) {
            throw new IllegalArgumentException("Ya existe un profesional con ese documento.");
        }

        repositorio.guardar(profesional);

        System.out.println("Profesional registrado correctamente.");
    }

    // Consulta todos los profesionales guardados.
    public List<Profesional> consultarProfesionales() {
        return repositorio.listar();
    }

    // Busca un profesional mediante su documento.
    public Profesional buscarProfesionalPorDocumento(String documento) {

        if (documento == null || documento.isBlank()) {
            return null;
        }

        return repositorio.buscarPorDocumento(documento);
    }

    // Crea un profesional y solicita su registro.
    public void crearProfesional(String nombre, String documento, String correo, String telefono) {

        Profesional profesional = new Profesional(
            nombre,
            documento,
            correo,
            telefono
        );

        registrarProfesional(profesional);
    }

    // Modifica los datos de un profesional existente.
    public boolean editarProfesional(String documento, String nuevoNombre,
            String nuevoCorreo, String nuevoTelefono) {

        Profesional profesional = buscarProfesionalPorDocumento(documento);

        if (profesional == null) {
            return false;
        }

        profesional.setNombre(nuevoNombre);
        profesional.setCorreo(nuevoCorreo);
        profesional.setTelefono(nuevoTelefono);

        return repositorio.actualizar(profesional);
    }

    // Activa o desactiva un profesional y guarda el cambio.
    public boolean cambiarEstadoProfesional(String documento, boolean activo) {

        Profesional profesional = buscarProfesionalPorDocumento(documento);

        if (profesional == null) {
            return false;
        }

        profesional.setActivo(activo);

        return repositorio.actualizar(profesional);
    }
    // Elimina un profesional utilizando su número de documento.
    public boolean eliminarProfesional(String documento) {

    // Verificamos que el documento haya sido recibido.
    if (documento == null || documento.isBlank()) {

        // Si está vacío, no se puede realizar la eliminación.
        return false;
    }

    // Buscamos primero el profesional.
    Profesional profesional =
            buscarProfesionalPorDocumento(documento);

    // Si no existe, no podemos eliminarlo.
    if (profesional == null) {

        // Indicamos que no se encontró el profesional.
        return false;
    }

    // Delegamos la eliminación al repositorio.
    return repositorio.eliminar(documento);
    }

}
