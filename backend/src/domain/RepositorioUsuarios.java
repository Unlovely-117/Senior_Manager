package domain;

import domain.entities.Usuario;
import java.util.List;
import java.util.UUID;

// Define las operaciones de almacenamiento de usuarios.
public interface RepositorioUsuarios {

    // Guarda un nuevo usuario.
    void guardar(Usuario usuario);

    // Devuelve la lista de usuarios registrados.
    List<Usuario> listar();

    // Busca un usuario utilizando su correo.
    Usuario buscarPorCorreo(String correo);

    default Usuario buscarPorId(UUID id) {
        if (id == null) return null;
        return listar().stream().filter(usuario -> id.equals(usuario.getId())).findFirst().orElse(null);
    }

    // Actualiza los datos de un usuario existente.
    boolean actualizar(Usuario usuario);

    // Actualiza una cuenta identificada por su correo actual.
    boolean actualizar(String correoActual, Usuario usuario);

    // Elimina un usuario utilizando su correo electrónico.
    boolean eliminar(String correo);
}
