package infrastructure.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;

/** Issues and verifies short-lived HS256 access tokens with explicit issuer and audience. */
public final class JwtTokenService {
    private final JwtConfiguration configuration;
    public JwtTokenService(JwtConfiguration configuration) { this.configuration = configuration; }

    public String issue(String subject, String role, String tokenId) {
        SecretKey key = configuration.getSigningKey();
        Instant now = Instant.now();
        return JWT.create()
            .withKeyId(configuration.getSigningKeyId())
            .withIssuer(configuration.getIssuer())
            .withAudience(configuration.getAudience())
            .withSubject(subject)
            .withClaim("role", role)
            .withJWTId(tokenId)
            .withIssuedAt(Date.from(now))
            .withExpiresAt(Date.from(now.plus(configuration.getTokenLifetime())))
            .sign(Algorithm.HMAC256(key.getEncoded()));
    }

    public TokenClaims verify(String token) {
        try {
            DecodedJWT header = JWT.decode(token);
            if (!"HS256".equals(header.getAlgorithm())) throw new InvalidJwtException();
            SecretKey key = configuration.getVerificationKey(header.getKeyId());
            JWTVerifier verifier = JWT.require(Algorithm.HMAC256(key.getEncoded()))
                .withIssuer(configuration.getIssuer())
                .withAudience(configuration.getAudience())
                .build();
            DecodedJWT verified = verifier.verify(token);
            if (verified.getExpiresAt() == null || verified.getSubject() == null || verified.getSubject().isBlank()
                    || verified.getClaim("role").isNull() || verified.getClaim("role").asString() == null
                    || verified.getId() == null || verified.getId().isBlank()) throw new InvalidJwtException();
            UUID.fromString(verified.getId());
            return new TokenClaims(verified.getSubject(), verified.getClaim("role").asString(), verified.getId(), verified.getExpiresAt().toInstant());
        } catch (JWTVerificationException | IllegalArgumentException failure) {
            throw new InvalidJwtException();
        }
    }

    public record TokenClaims(String subject, String role, String tokenId, Instant expiresAt) { }

    public static final class InvalidJwtException extends RuntimeException {
        public InvalidJwtException() { super("El token no es válido o expiró."); }
    }
}
