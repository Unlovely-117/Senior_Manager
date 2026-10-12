package presentation;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import application.usecases.GestionarUsuarios;
import application.usecases.GestionarUsuariosProfesionales;
import domain.entities.Profesional;
import domain.entities.Rol;
import domain.entities.Usuario;
import infrastructure.ArchivoProfesionales;
import infrastructure.ArchivoUsuarios;
import shared.security.PasswordHasher;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

public final class SeniorManageApiServer {

    private static final long SESSION_LIFETIME_MS = 8L * 60L * 60L * 1000L;
    private static final String JSON_CONTENT_TYPE = "application/json; charset=utf-8";

    private final GestionarUsuarios users;
    private final GestionarUsuariosProfesionales professionals;
    private final PasswordHasher passwordHasher = new PasswordHasher();
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    private SeniorManageApiServer() throws IOException {
        users = new GestionarUsuarios(new ArchivoUsuarios());
        professionals = new GestionarUsuariosProfesionales(new ArchivoProfesionales());
    }

    public static void main(String[] args) throws Exception {
        int port = Integer.getInteger("senior.manage.port", 8080);
        SeniorManageApiServer application = new SeniorManageApiServer();
        HttpServer server = HttpServer.create(
            new InetSocketAddress(InetAddress.getLoopbackAddress(), port),
            0
        );
        server.createContext("/api", application::handle);
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();
        System.out.println("Senior-Manage API disponible en http://127.0.0.1:" + port + "/api");
        System.out.println("Servidor local de desarrollo: no exponer sin HTTPS y controles de acceso revisados.");
    }

    private void handle(HttpExchange exchange) throws IOException {
        try {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String method = exchange.getRequestMethod().toUpperCase();
            String path = exchange.getRequestURI().getRawPath();
            if ("GET".equals(method) && "/api/health".equals(path)) {
                sendJson(exchange, 200, "{\"status\":\"ok\"}");
                return;
            }
            if ("POST".equals(method) && "/api/auth/login".equals(path)) {
                login(exchange);
                return;
            }
            if (path.startsWith("/api/auth/")) {
                Session session = requireSession(exchange);
                if (session == null) {
                    return;
                }
                if ("GET".equals(method) && "/api/auth/me".equals(path)) {
                    sendJson(exchange, 200,
                        "{\"email\":" + json(session.email)
                        + ",\"name\":" + json(session.name)
                        + ",\"role\":" + json(roleForClient(session.role))
                        + "}");
                    return;
                }
                if ("POST".equals(method) && "/api/auth/logout".equals(path)) {
                    sessions.remove(session.token);
                    sendMessage(exchange, 200, "Sesión cerrada.");
                    return;
                }
            }

            String[] segments = path.substring("/api/".length()).split("/");
            if (segments.length > 0 && "profesionales".equals(segments[0])) {
                handleProfessionals(exchange, method, segments);
                return;
            }
            if (segments.length > 0 && "usuarios".equals(segments[0])) {
                handleUsers(exchange, method, segments);
                return;
            }
            sendError(exchange, 404, "Ruta no encontrada.");
        } catch (IllegalArgumentException exception) {
            sendError(exchange, 400, exception.getMessage());
        } catch (Exception exception) {
            System.err.println("Error interno al procesar la solicitud de Senior-Manage.");
            sendError(exchange, 500, "Error interno del servidor.");
        } finally {
            exchange.close();
        }
    }

    private void login(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendError(exchange, 405, "Método no permitido.");
            return;
        }
        Map<String, String> form = readForm(exchange);
        String email = required(form, "email");
        String password = required(form, "password");
        Usuario user = users.autenticarUsuario(email, password);
        if (user == null) {
            sendError(exchange, 401, "Credenciales inválidas o cuenta inactiva.");
            return;
        }

        String token = newToken();
        Session session = new Session(token, user.getCorreo(), user.getNombre(), user.getRol());
        sessions.put(token, session);
        sendJson(exchange, 200,
            "{\"token\":" + json(token)
            + ",\"email\":" + json(user.getCorreo())
            + ",\"name\":" + json(user.getNombre())
            + ",\"role\":" + json(roleForClient(user.getRol()))
            + "}");
    }

    private void handleProfessionals(
            HttpExchange exchange,
            String method,
            String[] segments) throws IOException {
        Session session = requireAdministrator(exchange);
        if (session == null) {
            return;
        }

        if (segments.length == 1 && "GET".equals(method)) {
            sendJson(exchange, 200, serializeProfessionals(professionals.consultarProfesionales()));
            return;
        }
        if (segments.length == 1 && "POST".equals(method)) {
            Map<String, String> form = readForm(exchange);
            String name = requiredRecordField(form, "name");
            String document = requiredRecordField(form, "document");
            String email = validateEmail(requiredRecordField(form, "email"));
            String phone = requiredRecordField(form, "phone");
            if (professionals.buscarProfesionalPorDocumento(document) != null) {
                sendError(exchange, 409, "Ya existe un profesional con ese documento.");
                return;
            }
            professionals.crearProfesional(name, document, email, phone);
            sendMessage(exchange, 201, "Profesional creado.");
            return;
        }
        if (segments.length >= 2) {
            String document = decode(segments[1]);
            Profesional existing = professionals.buscarProfesionalPorDocumento(document);
            if (existing == null) {
                sendError(exchange, 404, "Profesional no encontrado.");
                return;
            }
            if (segments.length == 2 && "GET".equals(method)) {
                sendJson(exchange, 200, serializeProfessional(existing));
            } else if (segments.length == 2 && "PUT".equals(method)) {
                Map<String, String> form = readForm(exchange);
                String name = requiredRecordField(form, "name");
                String email = validateEmail(requiredRecordField(form, "email"));
                String phone = requiredRecordField(form, "phone");
                if (professionals.editarProfesional(document, name, email, phone)) {
                    sendMessage(exchange, 200, "Profesional actualizado.");
                } else {
                    sendError(exchange, 404, "Profesional no encontrado.");
                }
            } else if (segments.length == 3 && "estado".equals(segments[2]) && "PATCH".equals(method)) {
                boolean active = parseBoolean(required(readForm(exchange), "active"));
                professionals.cambiarEstadoProfesional(document, active);
                sendMessage(exchange, 200, "Estado actualizado.");
            } else if (segments.length == 2 && "DELETE".equals(method)) {
                professionals.eliminarProfesional(document);
                sendMessage(exchange, 200, "Profesional eliminado.");
            } else {
                sendError(exchange, 405, "Método no permitido.");
            }
            return;
        }
        sendError(exchange, 405, "Método no permitido.");
    }

    private void handleUsers(
            HttpExchange exchange,
            String method,
            String[] segments) throws IOException {
        Session session = requireAdministrator(exchange);
        if (session == null) {
            return;
        }

        if (segments.length == 1 && "GET".equals(method)) {
            sendJson(exchange, 200, serializeUsers(users.listarUsuarios()));
            return;
        }
        if (segments.length == 1 && "POST".equals(method)) {
            Map<String, String> form = readForm(exchange);
            String name = requiredRecordField(form, "name");
            String email = validateEmail(requiredRecordField(form, "email"));
            String password = required(form, "password");
            if (password.length() < 8) {
                throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres.");
            }
            Rol role = parseRole(required(form, "role"));
            String passwordHash = passwordHasher.generarHash(password);
            users.registrarUsuario(new Usuario(name, email, passwordHash, role));
            sendMessage(exchange, 201, "Usuario creado.");
            return;
        }

        if (segments.length >= 2) {
            String email = decode(segments[1]);
            Usuario existing = users.buscarUsuarioPorCorreo(email);
            if (existing == null) {
                sendError(exchange, 404, "Usuario no encontrado.");
                return;
            }

            if (segments.length == 2 && "GET".equals(method)) {
                sendJson(exchange, 200, serializeUser(existing));
            } else if (segments.length == 2 && "PUT".equals(method)) {
                Map<String, String> form = readForm(exchange);
                String name = requiredRecordField(form, "name");
                String newEmail = validateEmail(requiredRecordField(form, "email"));
                users.actualizarUsuario(email, name, newEmail);
                if (!email.equalsIgnoreCase(newEmail)) {
                    invalidateSessions(email);
                }
                sendMessage(exchange, 200, "Usuario actualizado.");
            } else if (segments.length == 3 && "rol".equals(segments[2]) && "PATCH".equals(method)) {
                if (session.email.equalsIgnoreCase(email)) {
                    sendError(exchange, 409, "No puedes cambiar tu propio rol mientras la sesión está activa.");
                    return;
                }
                Rol newRole = parseRole(required(readForm(exchange), "role"));
                if (wouldRemoveLastActiveAdministrator(existing, newRole, existing.isActivo())) {
                    sendError(exchange, 409, "Debe permanecer al menos un administrador activo.");
                    return;
                }
                if (!users.cambiarRol(email, newRole)) {
                    sendError(exchange, 404, "Usuario no encontrado.");
                    return;
                }
                invalidateSessions(email);
                sendMessage(exchange, 200, "Rol actualizado.");
            } else if (segments.length == 3 && "estado".equals(segments[2]) && "PATCH".equals(method)) {
                if (session.email.equalsIgnoreCase(email)) {
                    sendError(exchange, 409, "No puedes cambiar el estado de tu propia cuenta mientras la sesión está activa.");
                    return;
                }
                boolean active = parseBoolean(required(readForm(exchange), "active"));
                if (wouldRemoveLastActiveAdministrator(existing, existing.getRol(), active)) {
                    sendError(exchange, 409, "Debe permanecer al menos un administrador activo.");
                    return;
                }
                boolean changed = active ? users.activarUsuario(email) : users.desactivarUsuario(email);
                if (!changed) {
                    sendError(exchange, 404, "Usuario no encontrado.");
                    return;
                }
                if (!active) {
                    invalidateSessions(email);
                }
                sendMessage(exchange, 200, "Estado actualizado.");
            } else if (segments.length == 2 && "DELETE".equals(method)) {
                if (session.email.equalsIgnoreCase(email)) {
                    sendError(exchange, 409, "No puedes eliminar tu propia cuenta mientras la sesión está activa.");
                    return;
                }
                if (wouldRemoveLastActiveAdministrator(existing, null, false)) {
                    sendError(exchange, 409, "Debe permanecer al menos un administrador activo.");
                    return;
                }
                if (!users.eliminarUsuarioPorCorreo(email)) {
                    sendError(exchange, 404, "Usuario no encontrado.");
                    return;
                }
                invalidateSessions(email);
                sendMessage(exchange, 200, "Usuario eliminado.");
            } else {
                sendError(exchange, 405, "Método no permitido.");
            }
            return;
        }
        sendError(exchange, 405, "Método no permitido.");
    }

    private Session requireAdministrator(HttpExchange exchange) throws IOException {
        Session session = requireSession(exchange);
        if (session == null) {
            return null;
        }
        if (session.role != Rol.ADMINISTRADOR) {
            sendError(exchange, 403, "Esta operación requiere rol de administrador.");
            return null;
        }
        return session;
    }

    private Session requireSession(HttpExchange exchange) throws IOException {
        String authorization = exchange.getRequestHeaders().getFirst("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            sendError(exchange, 401, "Se requiere iniciar sesión.");
            return null;
        }

        String token = authorization.substring("Bearer ".length()).trim();
        Session session = sessions.get(token);
        if (session == null || session.expiresAt < System.currentTimeMillis()) {
            sessions.remove(token);
            sendError(exchange, 401, "La sesión expiró. Inicia sesión de nuevo.");
            return null;
        }

        Usuario currentUser = users.buscarUsuarioPorCorreo(session.email);
        if (currentUser == null || !currentUser.isActivo() || currentUser.getRol() != session.role) {
            sessions.remove(token);
            sendError(exchange, 401, "La cuenta ya no está habilitada para esta sesión.");
            return null;
        }
        return session;
    }

    private boolean wouldRemoveLastActiveAdministrator(
            Usuario target,
            Rol newRole,
            boolean newActive) {
        boolean targetWillRemainAdministrator = newRole == null
            ? false
            : newRole == Rol.ADMINISTRADOR && newActive;
        if (target.getRol() != Rol.ADMINISTRADOR || !target.isActivo() || targetWillRemainAdministrator) {
            return false;
        }
        int activeAdministrators = 0;
        for (Usuario user : users.listarUsuarios()) {
            if (user.getRol() == Rol.ADMINISTRADOR && user.isActivo()) {
                activeAdministrators++;
            }
        }
        return activeAdministrators <= 1;
    }

    private void invalidateSessions(String email) {
        sessions.entrySet().removeIf(entry -> entry.getValue().email.equalsIgnoreCase(email));
    }

    private String serializeProfessionals(List<Profesional> items) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) {
                json.append(',');
            }
            json.append(serializeProfessional(items.get(i)));
        }
        return json.append(']').toString();
    }

    private String serializeProfessional(Profesional item) {
        return "{\"name\":" + json(item.getNombre())
            + ",\"document\":" + json(item.getDocumento())
            + ",\"email\":" + json(item.getCorreo())
            + ",\"phone\":" + json(item.getTelefono())
            + ",\"active\":" + item.isActivo()
            + "}";
    }

    private String serializeUsers(List<Usuario> items) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) {
                json.append(',');
            }
            json.append(serializeUser(items.get(i)));
        }
        return json.append(']').toString();
    }

    private String serializeUser(Usuario item) {
        return "{\"name\":" + json(item.getNombre())
            + ",\"email\":" + json(item.getCorreo())
            + ",\"role\":" + json(roleForClient(item.getRol()))
            + ",\"active\":" + item.isActivo()
            + "}";
    }

    private String roleForClient(Rol role) {
        return role == Rol.ADMINISTRADOR ? "admin" : "professional";
    }

    private Map<String, String> readForm(HttpExchange exchange) throws IOException {
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = exchange.getRequestBody().read(buffer)) != -1) {
            body.write(buffer, 0, count);
            if (body.size() > 16_384) {
                throw new IllegalArgumentException("La solicitud es demasiado grande.");
            }
        }
        String encoded = new String(body.toByteArray(), StandardCharsets.UTF_8);
        Map<String, String> result = new HashMap<>();
        if (encoded.isEmpty()) {
            return result;
        }
        for (String pair : encoded.split("&")) {
            String[] parts = pair.split("=", 2);
            String key = decode(parts[0]);
            String value = parts.length == 2 ? decode(parts[1]) : "";
            result.put(key, value);
        }
        return result;
    }

    private String required(Map<String, String> form, String key) {
        String value = form.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("El campo " + key + " es obligatorio.");
        }
        return value.trim();
    }

    private String requiredRecordField(Map<String, String> form, String key) {
        String value = required(form, key);
        if (value.contains(";") || value.contains("\n") || value.contains("\r")) {
            throw new IllegalArgumentException("El campo " + key + " contiene caracteres no permitidos.");
        }
        return value;
    }

    private String validateEmail(String email) {
        if (!email.matches("^[^\\s;@]+@[^\\s;@]+\\.[^\\s;@]+$")) {
            throw new IllegalArgumentException("El correo electrónico no es válido.");
        }
        return email;
    }

    private Rol parseRole(String role) {
        if ("admin".equalsIgnoreCase(role) || "ADMINISTRADOR".equalsIgnoreCase(role)) {
            return Rol.ADMINISTRADOR;
        }
        if ("professional".equalsIgnoreCase(role) || "PROFESIONAL".equalsIgnoreCase(role)) {
            return Rol.PROFESIONAL;
        }
        throw new IllegalArgumentException("El rol indicado no es válido.");
    }

    private boolean parseBoolean(String value) {
        if ("true".equalsIgnoreCase(value)) {
            return true;
        }
        if ("false".equalsIgnoreCase(value)) {
            return false;
        }
        throw new IllegalArgumentException("El estado debe ser true o false.");
    }

    private String newToken() {
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private String json(String value) {
        StringBuilder escaped = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char character = value.charAt(i);
            switch (character) {
                case '"':
                    escaped.append("\\\"");
                    break;
                case '\\':
                    escaped.append("\\\\");
                    break;
                case '\b':
                    escaped.append("\\b");
                    break;
                case '\f':
                    escaped.append("\\f");
                    break;
                case '\n':
                    escaped.append("\\n");
                    break;
                case '\r':
                    escaped.append("\\r");
                    break;
                case '\t':
                    escaped.append("\\t");
                    break;
                default:
                    if (character < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) character));
                    } else {
                        escaped.append(character);
                    }
            }
        }
        return escaped.append('"').toString();
    }

    private void addCorsHeaders(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        String allowedOrigin = System.getProperty(
            "senior.manage.frontendOrigin",
            "http://localhost:5173"
        );
        if (origin != null && (origin.equals(allowedOrigin)
                || "http://127.0.0.1:5173".equals(origin))) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", origin);
            exchange.getResponseHeaders().set("Vary", "Origin");
            exchange.getResponseHeaders().set(
                "Access-Control-Allow-Headers",
                "Authorization, Content-Type"
            );
            exchange.getResponseHeaders().set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            );
        }
    }

    private void sendMessage(HttpExchange exchange, int status, String message) throws IOException {
        sendJson(exchange, status, "{\"message\":" + json(message) + "}");
    }

    private void sendError(HttpExchange exchange, int status, String message) throws IOException {
        sendJson(exchange, status, "{\"error\":" + json(message == null ? "Solicitud inválida." : message) + "}");
    }

    private void sendJson(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", JSON_CONTENT_TYPE);
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
    }

    private static final class Session {
        private final String token;
        private final String email;
        private final String name;
        private final Rol role;
        private final long expiresAt;

        private Session(String token, String email, String name, Rol role) {
            this.token = token;
            this.email = email;
            this.name = name;
            this.role = role;
            this.expiresAt = System.currentTimeMillis() + SESSION_LIFETIME_MS;
        }
    }
}
