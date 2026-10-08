package infrastructure;

import domain.EncriptadorContrasena;
import shared.security.PasswordHasher;

// Conecta el PasswordHasher del equipo con la interfaz que usa IniciarSesion.
public class EncriptadorEquipo implements EncriptadorContrasena {

    private final PasswordHasher hasher = new PasswordHasher();

    @Override
    public String hashear(String passwordPlano) {
        return hasher.generarHash(passwordPlano);
    }

    @Override
    public boolean verificar(String passwordPlano, String hashGuardado) {
        return hasher.verificarPassword(passwordPlano, hashGuardado);
    }
}