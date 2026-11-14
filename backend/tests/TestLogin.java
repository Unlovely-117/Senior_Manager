import application.usecases.GestionarUsuarios;
import application.usecases.LoginService;
import application.validation.FieldPolicies;
import domain.RepositorioUsuarios;
import domain.entities.Rol;
import domain.entities.Usuario;
import infrastructure.security.JwtConfiguration;
import infrastructure.security.JwtTokenService;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import shared.security.PasswordHasher;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Isolated login acceptance cases; uses only in-memory accounts and a test signing key. */
public final class TestLogin {
    private static final String TEST_SECRET = "test-only-secret-key-with-32-bytes-minimum";
    private static PasswordHasher hasher;
    private static JwtTokenService tokenService;
    private static LoginService login;
    private static Usuario active;
    private static LoginService.LoginResult success;
    private static LoginService.LoginResult tempResult;

    /** PBKDF2 a 600k iteraciones: lento a propósito, se comparte entre casos vía @BeforeAll. */
    @BeforeAll
    static void setUp() {
        hasher = new PasswordHasher();
        MemoryUsers repository = new MemoryUsers();
        active = new Usuario("Admin de prueba", "admin@example.test", hasher.generarHash("ClaveSegura123!"), Rol.ADMINISTRADOR);
        repository.guardar(active);
        Usuario temporary = new Usuario("Profesional de prueba", "pro@example.test", hasher.generarHashTemporal("Temporal123!"), Rol.PROFESIONAL);
        repository.guardar(temporary);
        Usuario inactive = new Usuario("Cuenta inactiva", "off@example.test", hasher.generarHash("ClaveSegura123!"), Rol.PROFESIONAL);
        inactive.desactivar();
        repository.guardar(inactive);

        tokenService = new JwtTokenService(new TestJwtConfiguration(Duration.ofMinutes(15)));
        login = new LoginService(new GestionarUsuarios(repository), tokenService);
        success = login.authenticate("  ADMIN@EXAMPLE.TEST ", "ClaveSegura123!");
        tempResult = login.authenticate("pro@example.test", "Temporal123!");
    }

    @Test
    void credencialesValidasAceptadas() {
        assertNotNull(success, "credenciales válidas aceptadas");
        assertFalse(success.mustChangePassword(), "contraseña normal no fuerza cambio");
    }

    @Test
    void jwtIdentificaLaCuentaYConservaRol() {
        JwtTokenService.TokenClaims claims = tokenService.verify(success.token());
        assertEquals(active.getCorreo(), claims.subject(), "JWT identifica la cuenta autenticada");
        assertEquals("ADMINISTRADOR", claims.role(), "JWT conserva el rol vigente");
        assertEquals(success.tokenId().toString(), claims.tokenId(), "JWT contiene el jti de sesión");
    }

    @Test
    void rechazosDeCredenciales() {
        assertNull(login.authenticate("admin@example.test", "incorrecta"), "contraseña incorrecta rechazada");
        assertNull(login.authenticate("missing@example.test", "ClaveSegura123!"), "cuenta inexistente rechazada");
        assertNull(login.authenticate("off@example.test", "ClaveSegura123!"), "cuenta inactiva rechazada");
        assertNull(login.authenticate(" ", "ClaveSegura123!"), "correo vacío rechazado");
        assertNull(login.authenticate("admin@example.test", " "), "contraseña vacía rechazada");
    }

    /** Contraseña temporal exige cambio al primer acceso. */
    @Test
    void contrasennaTemporalExigeCambio() {
        assertTrue(tempResult != null && tempResult.mustChangePassword(), "contraseña temporal exige cambio");
    }

    /** necesitaRehash: marcador de iteraciones históricas vs hash reciente. */
    @Test
    void necesitaRehashDetectaIteracionesViejas() {
        String hashActual = hasher.generarHash("ClaveSegura123!");
        assertFalse(hasher.necesitaRehash(hashActual), "hash con iteraciones actuales no necesita rehash");
        String historico = hashActual.replaceFirst("\\$\\d+\\$", java.util.regex.Matcher.quoteReplacement("$65536$"));
        assertTrue(hasher.necesitaRehash(historico), "hash con iteraciones históricas requiere rehash");
    }

    /** La política compartida de longitud mínima es 12 (coherente con el frontend). */
    @Test
    void longitudMinimaDeContrasennaEsDoce() {
        assertEquals(12, FieldPolicies.MIN_PASSWORD_LENGTH);
    }

    @Test
    void firmaAlteradaRechazada() {
        char[] alteredCharacters = success.token().toCharArray();
        int signatureStart = success.token().lastIndexOf('.') + 1;
        alteredCharacters[signatureStart] = alteredCharacters[signatureStart] == 'a' ? 'b' : 'a';
        String altered = new String(alteredCharacters);
        assertThrows(JwtTokenService.InvalidJwtException.class, () -> tokenService.verify(altered));
    }

    @Test
    void audienciaIncorrectaRechazada() {
        JwtTokenService otroServicio = new JwtTokenService(new TestJwtConfiguration(Duration.ofMinutes(15), "otra-audiencia"));
        assertThrows(JwtTokenService.InvalidJwtException.class, () -> otroServicio.verify(success.token()));
    }

    @Test
    void tokenExpiradoRechazado() {
        String expired = new JwtTokenService(new TestJwtConfiguration(Duration.ofSeconds(-10)))
            .issue("admin@example.test", "ADMINISTRADOR", UUID.randomUUID().toString());
        assertThrows(JwtTokenService.InvalidJwtException.class, () -> tokenService.verify(expired));
    }

    private static final class TestJwtConfiguration implements JwtConfiguration {
        private final SecretKey key = new SecretKeySpec(TEST_SECRET.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256");
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

    /** Stub mínimo pero correcto: actualiza por correo (necesario para el rehash tras login). */
    private static final class MemoryUsers implements RepositorioUsuarios {
        private final List<Usuario> users = new ArrayList<>();
        public void guardar(Usuario user) { users.add(user); }
        public List<Usuario> listar() { return new ArrayList<>(users); }
        public Usuario buscarPorCorreo(String email) {
            if (email == null) return null;
            return users.stream().filter(u -> u.getCorreo().equalsIgnoreCase(email.trim())).findFirst().orElse(null);
        }
        public boolean actualizar(Usuario user) { return actualizar(user.getCorreo(), user); }
        public boolean actualizar(String email, Usuario user) {
            for (int i = 0; i < users.size(); i++) {
                if (users.get(i).getCorreo().equalsIgnoreCase(email.trim())) {
                    users.set(i, user);
                    return true;
                }
            }
            return false;
        }
        public boolean eliminar(String email) { return users.removeIf(u -> u.getCorreo().equalsIgnoreCase(email)); }
    }
}
