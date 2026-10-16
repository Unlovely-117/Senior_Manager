package infrastructure.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

/** Strict external HS256 configuration. No development key or claim defaults are provided. */
public final class EnvironmentJwtConfiguration implements JwtConfiguration {
    private final String currentSecret = System.getenv("SENIOR_MANAGE_JWT_SECRET");
    private final String currentKeyId = System.getenv("SENIOR_MANAGE_JWT_KEY_ID");
    private final String previousSecret = System.getenv("SENIOR_MANAGE_JWT_PREVIOUS_SECRET");
    private final String previousKeyId = System.getenv("SENIOR_MANAGE_JWT_PREVIOUS_KEY_ID");
    private final String issuer = System.getenv("SENIOR_MANAGE_JWT_ISSUER");
    private final String audience = System.getenv("SENIOR_MANAGE_JWT_AUDIENCE");

    @Override public SecretKey getSigningKey() { return key(currentSecret, "SENIOR_MANAGE_JWT_SECRET"); }
    @Override public String getSigningAlgorithm() { return "HS256"; }
    @Override public Duration getTokenLifetime() { return Duration.ofMinutes(15); }
    @Override public String getIssuer() { return required(issuer, "SENIOR_MANAGE_JWT_ISSUER"); }
    @Override public String getAudience() { return required(audience, "SENIOR_MANAGE_JWT_AUDIENCE"); }
    @Override public String getSigningKeyId() { return required(currentKeyId, "SENIOR_MANAGE_JWT_KEY_ID"); }

    @Override public SecretKey getVerificationKey(String keyId) {
        if (keyId != null && keyId.equals(currentKeyId)) return key(currentSecret, "SENIOR_MANAGE_JWT_SECRET");
        if (keyId != null && keyId.equals(previousKeyId)) return key(previousSecret, "SENIOR_MANAGE_JWT_PREVIOUS_SECRET");
        throw new IllegalArgumentException("El identificador de clave JWT no está configurado.");
    }

    public void validateForStartup() {
        getSigningKey(); getSigningKeyId(); getIssuer(); getAudience();
        if ((previousSecret == null) != (previousKeyId == null))
            throw new IllegalStateException("Configure juntas SENIOR_MANAGE_JWT_PREVIOUS_SECRET y SENIOR_MANAGE_JWT_PREVIOUS_KEY_ID, o retire ambas.");
        if (previousKeyId != null && previousKeyId.equals(currentKeyId))
            throw new IllegalStateException("Los identificadores de clave JWT actual y anterior deben ser distintos.");
        if (previousSecret != null) key(previousSecret, "SENIOR_MANAGE_JWT_PREVIOUS_SECRET");
    }

    private static SecretKey key(String value, String variable) {
        String configured = required(value, variable);
        byte[] bytes = configured.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            Arrays.fill(bytes, (byte) 0);
            throw new IllegalStateException(variable + " debe contener al menos 32 bytes para HS256.");
        }
        SecretKey result = new SecretKeySpec(bytes, "HmacSHA256");
        Arrays.fill(bytes, (byte) 0);
        return result;
    }

    private static String required(String value, String variable) {
        if (value == null || value.isBlank()) throw new IllegalStateException("Falta la configuración externa " + variable + ".");
        return value;
    }
}
