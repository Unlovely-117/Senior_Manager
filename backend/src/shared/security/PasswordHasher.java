package shared.security;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

// Esta clase se encarga de convertir las contraseñas
// en valores seguros antes de almacenarlas.
public class PasswordHasher {

    // Cantidad de iteraciones utilizadas por PBKDF2.
    // Entre más iteraciones, más difícil resulta atacar el hash.
    private static final int ITERACIONES = 65536;

    // Tamaño de la clave generada, expresado en bits.
    private static final int LONGITUD_CLAVE = 256;

    // Tamaño del salt utilizado para cada contraseña.
    private static final int LONGITUD_SALT = 16;

    // Generador seguro de números aleatorios.
    // Se utiliza para crear un salt diferente para cada contraseña.
    private final SecureRandom random = new SecureRandom();

    // Genera un hash seguro para una contraseña.
    public String generarHash(String password) {

        // Verificamos que la contraseña exista.
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException(
                "La contraseña no puede estar vacía."
            );
        }

        // Creamos un salt aleatorio.
        byte[] salt = new byte[LONGITUD_SALT];
        random.nextBytes(salt);

        try {
            // Convertimos la contraseña en un arreglo de caracteres.
            char[] passwordChars = password.toCharArray();

            // Creamos la especificación para PBKDF2.
            PBEKeySpec spec = new PBEKeySpec(
                passwordChars,
                salt,
                ITERACIONES,
                LONGITUD_CLAVE
            );

            // Obtenemos el algoritmo PBKDF2 con HMAC SHA-256.
            SecretKeyFactory factory =
                SecretKeyFactory.getInstance(
                    "PBKDF2WithHmacSHA256"
                );

            // Generamos el hash.
            byte[] hash = factory
                .generateSecret(spec)
                .getEncoded();

            // Convertimos el salt y el hash a texto.
            String saltTexto =
                Base64.getEncoder().encodeToString(salt);

            String hashTexto =
                Base64.getEncoder().encodeToString(hash);

            // Guardamos en un solo texto:
            // algoritmo / iteraciones / salt / hash.
            return "PBKDF2-SHA256$"
                + ITERACIONES + "$"
                + saltTexto + "$"
                + hashTexto;

        } catch (Exception e) {

            // Si ocurre un problema con el algoritmo,
            // informamos el error.
            throw new RuntimeException(
                "No se pudo generar el hash de la contraseña.",
                e
            );
        }
    }

    // Verifica si una contraseña coincide con un hash almacenado.
    public boolean verificarPassword(
            String password,
            String hashAlmacenado) {

        // Validamos los datos recibidos.
        if (password == null || hashAlmacenado == null) {
            return false;
        }

        // Separamos las partes almacenadas.
        // Debemos obtener:
        // algoritmo, iteraciones, salt y hash.
        String[] partes = hashAlmacenado.split("\\$");

        // Si no tenemos exactamente cuatro partes,
        // el hash no tiene el formato esperado.
        if (partes.length != 4) {
            return false;
        }

        try {

            // Recuperamos la cantidad de iteraciones.
            int iteraciones = Integer.parseInt(partes[1]);

            // Recuperamos el salt.
            byte[] salt =
                Base64.getDecoder().decode(partes[2]);

            // Recuperamos el hash original.
            byte[] hashOriginal =
                Base64.getDecoder().decode(partes[3]);

            // Convertimos la contraseña ingresada
            // en caracteres.
            char[] passwordChars = password.toCharArray();

            // Creamos la especificación utilizando
            // el mismo salt y número de iteraciones.
            PBEKeySpec spec = new PBEKeySpec(
                passwordChars,
                salt,
                iteraciones,
                hashOriginal.length * 8
            );

            // Utilizamos nuevamente PBKDF2-SHA256.
            SecretKeyFactory factory =
                SecretKeyFactory.getInstance(
                    "PBKDF2WithHmacSHA256"
                );

            // Generamos el hash de la contraseña ingresada.
            byte[] hashNuevo =
                factory.generateSecret(spec).getEncoded();

            // Comparamos el hash nuevo con el almacenado.
            return MessageDigest.isEqual(
                hashOriginal,
                hashNuevo
            );

        } catch (Exception e) {

            // Si el hash tiene un formato incorrecto,
            // la contraseña simplemente no es válida.
            return false;
        }
    }
}