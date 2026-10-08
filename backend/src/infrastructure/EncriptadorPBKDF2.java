package infrastructure;

import domain.EncriptadorContrasena;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

// Protege contraseñas con PBKDF2 (incluido en el JDK).
// Formato guardado: iteraciones:salt:hash (Base64, sin ";").
public class EncriptadorPBKDF2 implements EncriptadorContrasena {

    private static final String ALGORITMO = "PBKDF2WithHmacSHA256";
    private static final int ITERACIONES = 120_000;
    private static final int BYTES_SALT = 16;
    private static final int BITS_HASH = 256;

    @Override
    public String hashear(String passwordPlano) {
        if (passwordPlano == null || passwordPlano.isBlank()) {
            throw new IllegalArgumentException("La contraseña es obligatoria.");
        }

        // Cada contraseña lleva su propio salt aleatorio.
        byte[] salt = new byte[BYTES_SALT];
        new SecureRandom().nextBytes(salt);

        byte[] hash = derivar(passwordPlano, salt, ITERACIONES);

        return ITERACIONES + ":"
                + Base64.getEncoder().encodeToString(salt) + ":"
                + Base64.getEncoder().encodeToString(hash);
    }

    @Override
    public boolean verificar(String passwordPlano, String hashGuardado) {
        if (passwordPlano == null || hashGuardado == null) {
            return false;
        }

        String[] partes = hashGuardado.split(":");
        if (partes.length != 3) {
            return false; // Formato inválido (por ejemplo, texto plano antiguo).
        }

        try {
            int iteraciones = Integer.parseInt(partes[0]);
            byte[] salt = Base64.getDecoder().decode(partes[1]);
            byte[] esperado = Base64.getDecoder().decode(partes[2]);

            byte[] calculado = derivar(passwordPlano, salt, iteraciones);

            // Comparación en tiempo constante.
            return MessageDigest.isEqual(esperado, calculado);

        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private byte[] derivar(String password, byte[] salt, int iteraciones) {
        try {
            PBEKeySpec spec = new PBEKeySpec(
                    password.toCharArray(), salt, iteraciones, BITS_HASH);
            return SecretKeyFactory.getInstance(ALGORITMO)
                    .generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new RuntimeException("No se pudo calcular el hash.", e);
        }
    }
}