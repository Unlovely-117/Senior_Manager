
package domain;

import domain.entities.Profesional;
import java.util.List;

// Define las operaciones de almacenamiento de p.
public interface RepositorioProfesionales {

    // Guarda un nuevo profesional.
    void guardar(Profesional profesional);

    // Consulta todos los profesionales registrados.
    List<Profesional> listar();

    // Busca un profesional por su documento.
    Profesional buscarPorDocumento(String documento);

    // Actualiza los datos de un profesional existente.
    boolean actualizar(Profesional profesional);

    // Elimina un profesional usando su documento.
    boolean eliminar(String documento);
}
