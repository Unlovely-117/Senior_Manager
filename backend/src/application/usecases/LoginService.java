package application.usecases;

import domain.entities.Usuario;
import infrastructure.security.JwtTokenService;
import shared.security.PasswordHasher;
import java.util.UUID;

/** Coordinates credential validation and short-lived access-token issuance. */
public final class LoginService {
    private final GestionarUsuarios users;
    private final JwtTokenService tokens;
    private final PasswordHasher passwordHasher = new PasswordHasher();

    public LoginService(GestionarUsuarios users, JwtTokenService tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    public LoginResult authenticate(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) return null;
        Usuario user = users.autenticarUsuario(email.trim().toLowerCase(java.util.Locale.ROOT), password);
        if (user == null) return null;
        String tokenId = UUID.randomUUID().toString();
        String token = tokens.issue(user.getCorreo(), user.getRol().name(), tokenId);
        return new LoginResult(user, token, UUID.fromString(tokenId), passwordHasher.esHashTemporal(user.getPasswordHash()));
    }

    public record LoginResult(Usuario user, String token, UUID tokenId, boolean mustChangePassword) { }
}
