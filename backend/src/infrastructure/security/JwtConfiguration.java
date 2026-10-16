package infrastructure.security;

import java.time.Duration;
import javax.crypto.SecretKey;

/**
 * External configuration contract for signed access tokens.
 * Implementations must fail closed when key material or claims are absent.
 */
public interface JwtConfiguration {

    SecretKey getSigningKey();

    String getSigningAlgorithm();

    Duration getTokenLifetime();

    String getIssuer();

    String getAudience();

    String getSigningKeyId();

    SecretKey getVerificationKey(String keyId);
}
