package application.usecases;

import domain.RepositorioUsuarios;
import domain.entities.Rol;
import domain.entities.Usuario;
import shared.security.PasswordHasher;

import java.util.List;

// Esta clase contiene los casos de uso relacionados con la gestión de usuarios.
// Pertenece a la capa de aplicación.
//
// Su responsabilidad es coordinar las operaciones:
// - Registrar usuarios
// - Buscar usuarios
// - Listar usuarios
// - Cambiar roles
// - Activar usuarios
// - Desactivar usuarios
// - Actualizar información
//
// Esta clase NO se encarga directamente de escribir archivos.
// Para eso utiliza el repositorio.
public class GestionarUsuarios {

    // Repositorio que utilizaremos para guardar y consultar usuarios.
    private final RepositorioUsuarios repositorio;
    private final PasswordHasher hasher;

    // Constructor de la clase.
    //
    // Recibimos el repositorio desde afuera.
    // Esto permite mantener separada la lógica de aplicación
    // de la forma en que realmente se almacenan los datos.
    public GestionarUsuarios(RepositorioUsuarios repositorio, PasswordHasher hasher) {
        this.repositorio = repositorio;
        this.hasher = hasher;
    }

    // =========================================================
    // REGISTRAR USUARIO
    // =========================================================

    // NUEVO: Registra un usuario recibiendo la contraseña en texto plano.
    // Primero la convierte en hash con PasswordHasher y luego crea el
    // Usuario, para que nunca se guarde la contraseña sin proteger.
    // Es la forma recomendada de registrar, porque así el hash coincide
    // con el que verifica el inicio de sesión (HU-1).
    public void registrarUsuario(
            String nombre,
            String correo,
            String passwordPlano,
            Rol rol) {

        // Generamos el hash seguro de la contraseña.
        String hash = hasher.generarHash(passwordPlano);

        // Creamos el usuario con el hash y reutilizamos el registro
        // existente, que valida duplicados y guarda.
        registrarUsuario(new Usuario(nombre, correo, hash, rol));
    }

    // Registra un nuevo usuario en el sistema.
    public void registrarUsuario(Usuario usuario) {

        // Verificamos que el usuario recibido no sea nulo.
        if (usuario == null) {
            throw new IllegalArgumentException(
                "El usuario no puede ser nulo."
            );
        }

        // Buscamos si ya existe un usuario con el mismo correo.
        //
        // El correo será nuestro identificador para esta primera versión.
        if (repositorio.buscarPorCorreo(usuario.getCorreo()) != null) {

            // Si ya existe, impedimos el registro duplicado.
            throw new IllegalArgumentException(
                "Ya existe un usuario con ese correo."
            );
        }

        // Si todas las validaciones fueron correctas,
        // enviamos el usuario al repositorio para guardarlo.
        repositorio.guardar(usuario);
    }

    // =========================================================
    // BUSCAR USUARIO
    // =========================================================

    // Busca un usuario utilizando su correo electrónico.
    public Usuario buscarUsuarioPorCorreo(String correo) {

        // Si el correo es nulo o está vacío,
        // no hacemos la búsqueda.
        if (correo == null || correo.isBlank()) {
            return null;
        }

        // Delegamos la búsqueda al repositorio.
        return repositorio.buscarPorCorreo(correo);
    }

    // =========================================================
    // LISTAR USUARIOS
    // =========================================================

    // Devuelve todos los usuarios registrados.
    public List<Usuario> listarUsuarios() {

        // El repositorio se encarga de recuperar
        // los usuarios almacenados.
        return repositorio.listar();
    }

    // =========================================================
    // CAMBIAR ROL
    // =========================================================

    // Cambia el rol de un usuario.
    public boolean cambiarRol(String correo, Rol nuevoRol) {

        //Verificamos que los datos sena validos
        if (correo == null || correo.isBlank() || nuevoRol == null) {
            return false;
        }

        // Primero buscamos el usuario.
        Usuario usuario = buscarUsuarioPorCorreo(correo);

        // Si no existe, no podemos modificarlo.
        if (usuario == null) {
            return false;
        }

        // Cambiamos el rol utilizando el método de la entidad Usuario.
        usuario.cambiarRol(nuevoRol);

        // Guardamos el cambio en el repositorio.
        return repositorio.actualizar(usuario);
    }

    // =========================================================
    // ACTIVAR USUARIO
    // =========================================================

    // Activa una cuenta de usuario.
    public boolean activarUsuario(String correo) {

        // Buscamos el usuario por correo.
        Usuario usuario = buscarUsuarioPorCorreo(correo);

        // Si no existe, informamos que no se pudo realizar la operación.
        if (usuario == null) {
            return false;
        }

        // Cambiamos su estado a activo.
        usuario.activar();

        // Guardamos el cambio.
        return repositorio.actualizar(usuario);
    }

    // =========================================================
    // DESACTIVAR USUARIO
    // =========================================================

    // Desactiva una cuenta de usuario.
    public boolean desactivarUsuario(String correo) {

        // Buscamos el usuario por correo.
        Usuario usuario = buscarUsuarioPorCorreo(correo);

        // Si no existe, no podemos desactivarlo.
        if (usuario == null) {
            return false;
        }

        // Cambiamos su estado a inactivo.
        usuario.desactivar();

        // Guardamos el cambio.
        return repositorio.actualizar(usuario);
    }

    // =========================================================
    // ACTUALIZAR USUARIO
    // =========================================================

    // Actualiza el nombre y el correo de un usuario.
    public boolean actualizarUsuario(
            String correoActual,
            String nuevoNombre,
            String nuevoCorreo) {

        // Buscamos al usuario utilizando su correo actual.
        Usuario usuario = buscarUsuarioPorCorreo(correoActual);

        // Si no existe, no podemos actualizarlo.
        if (usuario == null) {
            return false;
        }

        // Cambiamos el nombre del usuario.
        usuario.cambiarNombre(nuevoNombre);

        // Cambiamos el correo del usuario.
        usuario.cambiarCorreo(nuevoCorreo);

        // Guardamos los cambios en el repositorio.
        return repositorio.actualizar(usuario);
    }
 // =========================================================
    // ELIMINAR USUARIO
    // =========================================================

    // Elimina un usuario utilizando su correo electrónico.
    public boolean eliminarUsuario(String correo, String contraseña) {

        if (correo == null || correo.isBlank()) {
            return false;
        }

        if (contraseña == null || contraseña.isBlank()) {
            return false;
        }

        Usuario usuario = buscarUsuarioPorCorreo(correo);

        if (usuario == null) {
            return false;
        }

        // CAMBIO: la contraseña guardada es un hash, por lo que ya no se
        // puede comparar con equals. Se verifica con PasswordHasher.
        if (!hasher.verificarPassword(contraseña, usuario.getPasswordHash())) {
            return false;
        }

        return repositorio.eliminar(correo);
    }

}