package infrastructure;

import domain.RepositorioUsuarios;
import domain.entities.Usuario;
import domain.entities.Rol;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

// Esta clase se encarga de guardar y consultar los usuarios
// utilizando un archivo de texto (.txt).
// Pertenece a la capa de infraestructura porque maneja la persistencia.
public class ArchivoUsuarios implements RepositorioUsuarios {

    // Ubicación donde se almacenarán los usuarios.
    private final File archivo = new File("backend/data/usuarios.txt");

    // Constructor de la clase.
    // Se ejecuta cuando creamos un ArchivoUsuarios.
    public ArchivoUsuarios() {

        try {
            // Obtiene la carpeta donde se encuentra el archivo.
            File carpeta = archivo.getParentFile();

            // Si la carpeta todavía no existe...
            if (!carpeta.exists()) {

                // ...la crea.
                carpeta.mkdirs();
            }

            // Si el archivo usuarios.txt todavía no existe...
            if (!archivo.exists()) {

                // ...lo crea.
                archivo.createNewFile();
            }

        } catch (IOException e) {

            // Si ocurre un problema creando la carpeta o el archivo,
            // se informa el error.
            throw new RuntimeException(
                "No se pudo preparar el archivo de usuarios.", e
            );
        }
    }

    // Guarda un nuevo usuario en el archivo TXT.
    @Override
    public void guardar(Usuario usuario) {

        // BufferedWriter permite escribir texto en el archivo.
        // El true en FileWriter significa que agregaremos el usuario
        // al final del archivo sin borrar los registros anteriores.
        try (BufferedWriter escritor =
                new BufferedWriter(new FileWriter(archivo, true))) {

            // Escribimos los datos del usuario separados por ";"
            // para poder identificarlos posteriormente.
            escritor.write(
                usuario.getNombre() + ";" +
                usuario.getCorreo() + ";" +
                usuario.getPasswordHash() + ";" +
                usuario.getRol().name() + ";" +
                usuario.isActivo()
            );

            // Después de guardar un usuario,
            // pasamos a una nueva línea.
            escritor.newLine();

        } catch (IOException e) {

            // Si ocurre un problema al escribir,
            // mostramos un mensaje de error.
            throw new RuntimeException(
                "No se pudo guardar el usuario.", e
            );
        }
    }

    // Consulta todos los usuarios almacenados en el archivo.
    @Override
    public List<Usuario> listar() {

        // Creamos una lista vacía donde iremos almacenando
        // los usuarios encontrados.
        List<Usuario> usuarios = new ArrayList<>();

        // BufferedReader permite leer el archivo línea por línea.
        try (BufferedReader lector =
                new BufferedReader(new FileReader(archivo))) {

            // Variable que almacenará cada línea leída.
            String linea;

            // Mientras existan líneas en el archivo,
            // las seguimos leyendo.
            while ((linea = lector.readLine()) != null) {

                // Dividimos la línea utilizando ";" como separador.
                // El -1 permite conservar campos vacíos.
                String[] datos = linea.split(";", -1);

                // Cada usuario debe tener exactamente 5 datos:
                // nombre, correo, contraseña, rol y estado.
                if (datos.length != 5) {

                    // Si la línea está dañada o incompleta,
                    // simplemente la ignoramos.
                    continue;
                }

                // Creamos un objeto Usuario utilizando
                // los datos obtenidos del archivo.
                Usuario usuario = new Usuario(
                    datos[0],              // Nombre
                    datos[1],              // Correo
                    datos[2],              // Contraseña almacenada
                    Rol.valueOf(datos[3])  // Rol
                );

                // Revisamos el estado almacenado en el archivo.
                if (Boolean.parseBoolean(datos[4])) {

                    // Si dice true, activamos el usuario.
                    usuario.activar();

                } else {

                    // Si dice false, lo dejamos inactivo.
                    usuario.desactivar();
                }

                // Agregamos el usuario reconstruido
                // a la lista de usuarios.
                usuarios.add(usuario);
            }

        } catch (IOException e) {

            // Si ocurre un problema leyendo el archivo,
            // informamos el error.
            throw new RuntimeException(
                "No se pudieron consultar los usuarios.", e
            );
        }

        // Devolvemos la lista completa de usuarios.
        return usuarios;
    }

    // Busca un usuario utilizando su correo electrónico.
    @Override
    public Usuario buscarPorCorreo(String correo) {

        // Si el correo no existe o está vacío,
        // no realizamos la búsqueda.
        if (correo == null || correo.isBlank()) {
            return null;
        }

        // Recorremos todos los usuarios almacenados.
        for (Usuario usuario : listar()) {

            // Comparamos el correo buscado con el correo del usuario.
            // equalsIgnoreCase permite que mayúsculas y minúsculas
            // no afecten la comparación.
            if (usuario.getCorreo().equalsIgnoreCase(correo)) {

                // Si encontramos coincidencia,
                // devolvemos ese usuario.
                return usuario;
            }
        }

        // Si no encontramos ningún usuario,
        // devolvemos null.
        return null;
    }

    // Actualiza la información de un usuario existente.
    @Override
    public boolean actualizar(Usuario usuario) {
        if (usuario == null || usuario.getCorreo() == null || usuario.getCorreo().isBlank()) {
            return false;
        }
        return actualizar(usuario.getCorreo(), usuario);
    }

    @Override
    public boolean actualizar(String correoActual, Usuario usuario) {
        if (correoActual == null || correoActual.isBlank()
                || usuario == null || usuario.getCorreo() == null || usuario.getCorreo().isBlank()) {
            return false;
        }

        List<Usuario> usuarios = listar();
        int indiceEncontrado = -1;
        for (int i = 0; i < usuarios.size(); i++) {
            if (usuarios.get(i).getCorreo().trim().equalsIgnoreCase(correoActual.trim())) {
                indiceEncontrado = i;
                break;
            }
        }
        if (indiceEncontrado < 0) {
            return false;
        }

        for (int i = 0; i < usuarios.size(); i++) {
            if (i != indiceEncontrado
                    && usuarios.get(i).getCorreo().trim().equalsIgnoreCase(usuario.getCorreo().trim())) {
                return false;
            }
        }

        usuarios.set(indiceEncontrado, usuario);
        guardarTodos(usuarios);
        return true;
    }

    private void guardarTodos(List<Usuario> usuarios) {
        Path destino = archivo.toPath();
        Path temporal = null;
        try {
            temporal = Files.createTempFile(destino.getParent(), "usuarios-", ".tmp");
            try (BufferedWriter escritor = new BufferedWriter(new FileWriter(temporal.toFile()))) {
                for (Usuario usuario : usuarios) {
                    escritor.write(
                        usuario.getNombre() + ";" +
                        usuario.getCorreo() + ";" +
                        usuario.getPasswordHash() + ";" +
                        usuario.getRol().name() + ";" +
                        usuario.isActivo()
                    );
                    escritor.newLine();
                }
            }
            Files.move(temporal, destino, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            if (temporal != null) {
                try {
                    Files.deleteIfExists(temporal);
                } catch (IOException cleanupFailure) {
                    e.addSuppressed(cleanupFailure);
                }
            }
            throw new RuntimeException("No se pudo reescribir el archivo de usuarios.", e);
        }
    }

// =========================================================
    // ELIMINAR USUARIO
    // =========================================================

    // Elimina un usuario utilizando su correo electrónico.
    @Override
    public boolean eliminar(String correo) {

        // Verificamos que el correo sea válido.
        if (correo == null || correo.isBlank()) {
            return false;
        }

        // Obtenemos todos los usuarios almacenados.
        List<Usuario> usuarios = listar();

        // Buscamos el usuario por su correo.
        boolean encontrado = false;

        for (int i = 0; i < usuarios.size(); i++) {

            Usuario usuario = usuarios.get(i);

            // Comparamos los correos sin importar mayúsculas o minúsculas.
            if (usuario.getCorreo().equalsIgnoreCase(correo)) {

                // Eliminamos el usuario de la lista.
                usuarios.remove(i);

                encontrado = true;
                break;
            }
        }

        // Si no encontramos el usuario, no hacemos cambios.
        if (!encontrado) {
            return false;
        }

        guardarTodos(usuarios);
        return true;
    }
}