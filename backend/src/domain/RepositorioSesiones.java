package domain;

import java.time.Instant;
import java.util.UUID;

public interface RepositorioSesiones {
    void registrar(UUID tokenId, String email, Instant expiresAt);
    boolean estaActiva(UUID tokenId, String email, Instant now);
    void revocar(UUID tokenId);
    void revocarOtras(String email, UUID conservarTokenId);
    void revocarTodas(String email);
}
