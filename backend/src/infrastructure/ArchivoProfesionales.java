
package infrastructure;

import domain.RepositorioProfesionales;
import domain.entities.Profesional;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

// Implementa el almacenamiento de profesionales mediante un archivo TXT.
public class ArchivoProfesionales implements RepositorioProfesionales {

    private final String rutaArchivo = new File(
        System.getProperty("senior.manage.dataDir", "backend/data"),
        "profesionales.txt"
    ).getPath();

    // Crea el archivo(txt) si todavía no existe.
    private void prepararArchivo() {
        File archivo = new File(rutaArchivo);

        try {
            File carpeta = archivo.getParentFile();

            if (!carpeta.exists()) {
                carpeta.mkdirs();
            }

            if (!archivo.exists()) {
                archivo.createNewFile();
            }

        } catch (IOException e) {
            throw new RuntimeException("No se pudo preparar el archivo de profesionales.", e);
        }
    }

    // Guarda un profesional nuevo al final del archivo.
    @Override
    public synchronized void guardar(Profesional profesional) {
        prepararArchivo();

        List<Profesional> profesionales = listar();
        profesionales.add(profesional);
        guardarTodos(profesionales);
    }

    // Lee todos los profesionales almacenados(txt).
    @Override
    public synchronized List<Profesional> listar() {
        prepararArchivo();

        List<Profesional> profesionales = new ArrayList<>();

        try (BufferedReader lector = Files.newBufferedReader(
                Path.of(rutaArchivo),
                StandardCharsets.UTF_8)) {

            String linea;

            while ((linea = lector.readLine()) != null) {
                String[] datos = linea.split(";", -1);

                if (datos.length == 5) {
                    Profesional profesional = new Profesional(
                        datos[0],
                        datos[1],
                        datos[2],
                        datos[3]
                    );

                    profesional.setActivo(Boolean.parseBoolean(datos[4]));
                    profesionales.add(profesional);
                }
            }

        } catch (IOException e) {
            throw new RuntimeException("No se pudieron consultar los profesionales.", e);
        }

        return profesionales;
    }

    // Busca un profesional por su documento.
    @Override
    public synchronized Profesional buscarPorDocumento(String documento) {
        for (Profesional profesional : listar()) {
            if (profesional.getDocumento().equals(documento)) {
                return profesional;
            }
        }

        return null;
    }

    // Actualiza los datos de un profesional sin borrar los demás.
    @Override
    public synchronized boolean actualizar(Profesional profesionalActualizado) {
        List<Profesional> profesionales = listar();
        boolean encontrado = false;

        for (int i = 0; i < profesionales.size(); i++) {
            if (profesionales.get(i).getDocumento().equals(
                    profesionalActualizado.getDocumento())) {

                profesionales.set(i, profesionalActualizado);
                encontrado = true;
                break;
            }
        }

        if (encontrado) {
            guardarTodos(profesionales);
        }

        return encontrado;
    }
    // Guarda nuevamente todos los profesionales en el archivo.
    private void guardarTodos(List<Profesional> profesionales) {
        StringBuilder contenido = new StringBuilder();
        for (Profesional profesional : profesionales) {
            contenido.append(profesional.getNombre()).append(';')
                .append(profesional.getDocumento()).append(';')
                .append(profesional.getCorreo()).append(';')
                .append(profesional.getTelefono()).append(';')
                .append(profesional.isActivo())
                .append(System.lineSeparator());
        }

        reemplazarArchivo(contenido.toString(), "No se pudieron guardar los profesionales.");
    }

    private void reemplazarArchivo(String contenido, String mensajeError) {
        Path destino = Path.of(rutaArchivo);
        Path temporal = null;
        try {
            temporal = Files.createTempFile(destino.getParent(), "profesionales-", ".tmp");
            Files.writeString(temporal, contenido, StandardCharsets.UTF_8);
            try {
                Files.move(temporal, destino,
                    StandardCopyOption.REPLACE_EXISTING,
                    StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporal, destino, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new RuntimeException(mensajeError, exception);
        } finally {
            if (temporal != null) {
                try {
                    Files.deleteIfExists(temporal);
                } catch (IOException exception) {
                    System.err.println("No se pudo eliminar el archivo temporal de profesionales.");
                }
            }
        }
    }

    // Elimina un profesional del archivo utilizando su documento.
    @Override
    public synchronized boolean eliminar(String documento) {
     // Obtenemos todos los profesionales guardados.
        List<Profesional> profesionales = listar();

    // Buscamos el profesional cuyo documento coincida.
        boolean eliminado = profesionales.removeIf(
        profesional ->
            profesional.getDocumento().equalsIgnoreCase(documento)
    );
    // Si se encontró el profesional, guardamos nuevamente
    // la lista sin el profesional eliminado.
    if (eliminado) {
    // Reescribimos el archivo con los profesionales restantes.
        guardarTodos(profesionales);
}
    // true significa que se eliminó.
    // false significa que no existía.
    return eliminado;
    }
}