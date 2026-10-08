package domain;

/*
Define cómo se protegen y comprueban las contraseñas.
 Está en el dominio para que los casos de uso no dependan
 de ningún algoritmo concreto.
 */
public interface EncriptadorContrasena {

    // Convierte una contraseña en un hash seguro para guardarlo.
    String hashear(String passwordPlano);

    // Comprueba si una contraseña coincide con un hash guardado.
    boolean verificar(String passwordPlano, String hashGuardado);
}