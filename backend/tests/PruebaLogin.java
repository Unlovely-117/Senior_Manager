import application.usecases.GestionarUsuarios;
import application.usecases.LoginService;
import domain.RepositorioUsuarios;
import domain.entities.Rol;
import domain.entities.Usuario;
import infrastructure.security.JwtConfiguration;
import infrastructure.security.JwtTokenService;
import shared.security.PasswordHasher;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

/** Isolated login acceptance cases; uses only in-memory accounts and a test signing key. */
public final class PruebaLogin {
    private static int assertions;

    public static void main(String[] args) {
        PasswordHasher hasher = new PasswordHasher();
        MemoryUsers repository = new MemoryUsers();
        Usuario active = new Usuario("Admin de prueba", "admin@example.test", hasher.generarHash("ClaveSegura123!"), Rol.ADMINISTRADOR);
        repository.guardar(active);
        Usuario temporary = new Usuario("Profesional de prueba", "pro@example.test", hasher.generarHashTemporal("Temporal123!"), Rol.PROFESIONAL);
        repository.guardar(temporary);
        Usuario inactive = new Usuario("Cuenta inactiva", "off@example.test", hasher.generarHash("ClaveSegura123!"), Rol.PROFESIONAL);
        inactive.desactivar();
        repository.guardar(inactive);

        TestJwtConfiguration config = new TestJwtConfiguration(Duration.ofMinutes(15));
        JwtTokenService tokenService = new JwtTokenService(config);
        LoginService login = new LoginService(new GestionarUsuarios(repository), tokenService);

        LoginService.LoginResult success = login.authenticate("  ADMIN@EXAMPLE.TEST ", "ClaveSegura123!");
        check(success != null, "credenciales válidas aceptadas");
        check(!success.mustChangePassword(), "contraseña normal no fuerza cambio");
        JwtTokenService.TokenClaims claims = tokenService.verify(success.token());
        check(claims.subject().equals(active.getCorreo()), "JWT identifica la cuenta autenticada");
        check(claims.role().equals("ADMINISTRADOR"), "JWT conserva el rol vigente");
        check(claims.tokenId().equals(success.tokenId().toString()), "JWT contiene el jti de sesión");

        check(login.authenticate("admin@example.test", "incorrecta") == null, "contraseña incorrecta rechazada");
        check(login.authenticate("missing@example.test", "ClaveSegura123!") == null, "cuenta inexistente rechazada");
        check(login.authenticate("off@example.test", "ClaveSegura123!") == null, "cuenta inactiva rechazada");
        check(login.authenticate(" ", "ClaveSegura123!") == null, "correo vacío rechazado");
        check(login.authenticate("admin@example.test", " ") == null, "contraseña vacía rechazada");
        LoginService.LoginResult tempResult = login.authenticate("pro@example.test", "Temporal123!");
        check(tempResult != null && tempResult.mustChangePassword(), "contraseña temporal exige cambio");

        char[] alteredCharacters = success.token().toCharArray();
        int signatureStart = success.token().lastIndexOf('.') + 1;
        alteredCharacters[signatureStart] = alteredCharacters[signatureStart] == 'a' ? 'b' : 'a';
        String altered = new String(alteredCharacters);
        expectInvalid(tokenService, altered, "firma alterada rechazada");
        expectInvalid(new JwtTokenService(new TestJwtConfiguration(Duration.ofMinutes(15), "otra-audiencia")),
            success.token(), "audiencia incorrecta rechazada");
        String expired = new JwtTokenService(new TestJwtConfiguration(Duration.ofSeconds(-10)))
            .issue("admin@example.test", "ADMINISTRADOR", UUID.randomUUID().toString());
        expectInvalid(tokenService, expired, "token expirado rechazado");

        System.out.println("PruebaLogin: " + assertions + " casos/verificaciones correctos.");
    }

    private static void expectInvalid(JwtTokenService service, String token, String message) {
        try {
            service.verify(token);
            throw new AssertionError(message);
        } catch (JwtTokenService.InvalidJwtException expected) {
            check(true, message);
        }
    }

    private static void check(boolean condition, String message) {
        assertions++;
        if (!condition) throw new AssertionError(message);
    }

    private static final class TestJwtConfiguration implements JwtConfiguration {
        private final SecretKey key = new SecretKeySpec("test-only-secret-key-with-32-bytes-minimum".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256");
        private final Duration lifetime;
        private final String audience;
        private TestJwtConfiguration(Duration lifetime) { this(lifetime, "senior-manager-login-test"); }
        private TestJwtConfiguration(Duration lifetime, String audience) { this.lifetime = lifetime; this.audience = audience; }
        public SecretKey getSigningKey() { return key; }
        public String getSigningAlgorithm() { return "HS256"; }
        public Duration getTokenLifetime() { return lifetime; }
        public String getIssuer() { return "senior-manager-test"; }
        public String getAudience() { return audience; }
        public String getSigningKeyId() { return "test-key"; }
        public SecretKey getVerificationKey(String keyId) {
            if (!"test-key".equals(keyId)) throw new IllegalArgumentException("unknown test key");
            return key;
        }
    }

    private static final class MemoryUsers implements RepositorioUsuarios {
        private final List<Usuario> users = new ArrayList<>();
        public void guardar(Usuario user) { users.add(user); }
        public List<Usuario> listar() { return new ArrayList<>(users); }
        public Usuario buscarPorCorreo(String email) {
            if (email == null) return null;
            return users.stream().filter(u -> u.getCorreo().equalsIgnoreCase(email.trim())).findFirst().orElse(null);
        }
        public boolean actualizar(Usuario user) { return users.contains(user); }
        public boolean actualizar(String email, Usuario user) { return actualizar(user); }
        public boolean eliminar(String email) { return users.removeIf(u -> u.getCorreo().equalsIgnoreCase(email)); }
    }
}
