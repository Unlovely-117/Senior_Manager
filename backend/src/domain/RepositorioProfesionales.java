
package domain;

import domain.entities.Profesional;
import java.util.List;
import java.util.UUID;

// Define las operaciones de almacenamiento de p.
public interface RepositorioProfesionales {

    // Guarda un nuevo profesional.
    void guardar(Profesional profesional);

    // Consulta todos los profesionales registrados.
    List<Profesional> listar();

    // Busca un profesional por su documento.
    Profesional buscarPorDocumento(String documento);

    default Profesional buscarPorId(UUID id) {
        if (id == null) return null;
        return listar().stream().filter(profesional -> id.equals(profesional.getId())).findFirst().orElse(null);
    }

    default Profesional buscarPorCuentaId(UUID accountId) {
        return null;
    }

    default boolean vincularCuenta(String documento, UUID accountId) {
        return false;
    }

    // Actualiza los datos de un profesional existente.
    boolean actualizar(Profesional profesional);

    // Elimina un profesional usando su documento.
    boolean eliminar(String documento);
}
