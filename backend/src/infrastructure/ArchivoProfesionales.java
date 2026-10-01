
package infrastructure;

import domain.RepositorioProfesionales;
import domain.entities.Profesional;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

// Implementa el almacenamiento de profesionales mediante un archivo TXT.
public class ArchivoProfesionales implements RepositorioProfesionales {

    private final String rutaArchivo = "backend/data/profesionales.txt";

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
    public void guardar(Profesional profesional) {
        prepararArchivo();

        try (BufferedWriter escritor = new BufferedWriter(new FileWriter(rutaArchivo, true))) {

            escritor.write(
                profesional.getNombre() + ";" +
                profesional.getDocumento() + ";" +
                profesional.getCorreo() + ";" +
                profesional.getTelefono() + ";" +
                profesional.isActivo()
            );

            escritor.newLine();

        } catch (IOException e) {
            throw new RuntimeException("No se pudo guardar el profesional.", e);
        }
    }

    // Lee todos los profesionales almacenados(txt).
    @Override
    public List<Profesional> listar() {
        prepararArchivo();

        List<Profesional> profesionales = new ArrayList<>();

        try (BufferedReader lector = new BufferedReader(new FileReader(rutaArchivo))) {

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
    public Profesional buscarPorDocumento(String documento) {
        for (Profesional profesional : listar()) {
            if (profesional.getDocumento().equals(documento)) {
                return profesional;
            }
        }

        return null;
    }

    // Actualiza los datos de un profesional sin borrar los demás.
    @Override
    public boolean actualizar(Profesional profesionalActualizado) {
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

    // Elimina un profesional por su documento.
    @Override
    public boolean eliminar(String documento) {
        List<Profesional> profesionales = listar();

        boolean eliminado = profesionales.removeIf(
            profesional -> profesional.getDocumento().equals(documento)
        );

        if (eliminado) {
            guardarTodos(profesionales);
        }

        return eliminado;
    }

    // Reescribe el archivo conservando todos los profesionales restantes.
    private void guardarTodos(List<Profesional> profesionales) {
        prepararArchivo();

        try (BufferedWriter escritor = new BufferedWriter(new FileWriter(rutaArchivo, false))) {

            for (Profesional profesional : profesionales) {
                escritor.write(
                    profesional.getNombre() + ";" +
                    profesional.getDocumento() + ";" +
                    profesional.getCorreo() + ";" +
                    profesional.getTelefono() + ";" +
                    profesional.isActivo()
                );

                escritor.newLine();
            }

        } catch (IOException e) {
            throw new RuntimeException("No se pudieron actualizar los registros.", e);
        }
    }
}