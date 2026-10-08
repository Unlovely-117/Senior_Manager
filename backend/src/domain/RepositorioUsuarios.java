package domain;

import domain.entities.Usuario;
import java.util.List;

// Define las operaciones de almacenamiento de usuarios.
public interface RepositorioUsuarios {

    // Guarda un nuevo usuario.
    void guardar(Usuario usuario);

    // Devuelve la lista de usuarios registrados.
    List<Usuario> listar();

    // Busca un usuario utilizando su correo.
    Usuario buscarPorCorreo(String correo);

    // Actualiza los datos de un usuario existente.
    boolean actualizar(Usuario usuario);

    // Elimina un usuario utilizando su contraseña.
    boolean eliminar(String contraseña);
}