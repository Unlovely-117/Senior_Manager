package presentation;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import application.usecases.GestionarUsuarios;
import application.usecases.GestionarUsuariosProfesionales;
import application.usecases.AuthorizationService;
import application.usecases.AuthorizationService.Module;
import application.usecases.AuthorizationService.Operation;
import application.usecases.GestionarPacientes;
import application.usecases.GestionarAntecedentes;
import application.usecases.GestionarPermisos;
import application.usecases.GestionarAsignaciones;
import application.usecases.LoginService;
import domain.entities.Antecedente;
import domain.entities.AsignacionProfesionalPaciente;
import domain.entities.Paciente;
import domain.entities.PacienteAsignacionResumen;
import domain.entities.PaginaPacientesAsignacion;
import domain.entities.Permiso;
import domain.entities.Profesional;
import domain.entities.Rol;
import domain.entities.Usuario;
import infrastructure.PostgresRepositorioPacientes;
import infrastructure.PostgresRepositorioAntecedentes;
import infrastructure.PostgresRepositorioPermisos;
import infrastructure.PostgresRepositorioAsignaciones;
import infrastructure.PostgresRepositorioSesiones;
import infrastructure.PostgresRepositorioUsuarios;
import infrastructure.PostgresRepositorioProfesionales;
import infrastructure.persistence.EnvironmentDatabaseConfiguration;
import infrastructure.persistence.DocumentoPacienteDuplicadoException;
import infrastructure.persistence.JdbcConnectionProvider;
import infrastructure.persistence.PersistenceException;
import shared.security.PasswordHasher;
import infrastructure.security.EnvironmentJwtConfiguration;
import infrastructure.security.JwtTokenService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import java.util.concurrent.Executors;

public final class SeniorManageApiServer {

    private static final String JSON_CONTENT_TYPE = "application/json; charset=utf-8";

    private final GestionarUsuarios users;
    private final GestionarUsuariosProfesionales professionals;
    private final AuthorizationService authorization = new AuthorizationService();
    private final PasswordHasher passwordHasher = new PasswordHasher();
    private final EnvironmentDatabaseConfiguration databaseConfiguration = new EnvironmentDatabaseConfiguration();
    private final JdbcConnectionProvider jdbcConnections = new JdbcConnectionProvider(databaseConfiguration);
    private final PostgresRepositorioUsuarios userRepository = new PostgresRepositorioUsuarios(jdbcConnections);
    private final PostgresRepositorioProfesionales professionalRepository = new PostgresRepositorioProfesionales(jdbcConnections);
    private final PostgresRepositorioPermisos permissionRepository = new PostgresRepositorioPermisos(jdbcConnections);
    private final GestionarPermisos permissionManagement = new GestionarPermisos(permissionRepository);
    private final GestionarPacientes patientManagement = new GestionarPacientes(new PostgresRepositorioPacientes(jdbcConnections));
    private final PostgresRepositorioAsignaciones assignmentRepository = new PostgresRepositorioAsignaciones(jdbcConnections);
    private final GestionarAsignaciones assignmentManagement = new GestionarAsignaciones(
        assignmentRepository, new PostgresRepositorioPacientes(jdbcConnections), userRepository, professionalRepository);
    private final GestionarAntecedentes historyManagement = new GestionarAntecedentes(
        new PostgresRepositorioAntecedentes(jdbcConnections), new PostgresRepositorioPacientes(jdbcConnections));
    private final PostgresRepositorioSesiones sessionRepository = new PostgresRepositorioSesiones(jdbcConnections);
    private final EnvironmentJwtConfiguration jwtConfiguration = new EnvironmentJwtConfiguration();
    private final JwtTokenService jwtTokens = new JwtTokenService(jwtConfiguration);
    private final LoginService loginService;

    private SeniorManageApiServer() throws IOException {
        users = new GestionarUsuarios(userRepository);
        professionals = new GestionarUsuariosProfesionales(professionalRepository);
        loginService = new LoginService(users, jwtTokens);
    }

    private synchronized boolean eliminarProfesionalCompleto(String documento, Usuario linkedAccount) {
        Profesional profile = professionals.buscarProfesionalPorDocumento(documento);
        if (profile == null || !professionals.eliminarProfesional(documento)) {
            return false;
        }

        boolean removeAccount = linkedAccount != null
            && linkedAccount.getRol() == Rol.PROFESIONAL;
        if (!removeAccount) {
            return true;
        }

        try {
            if (!users.eliminarUsuarioPorCorreo(linkedAccount.getCorreo())) {
                throw new IllegalStateException("No se pudo eliminar la cuenta profesional vinculada.");
            }
        } catch (RuntimeException deletionFailure) {
            try {
                professionals.registrarProfesional(profile);
            } catch (RuntimeException restoreFailure) {
                deletionFailure.addSuppressed(restoreFailure);
            }
            throw deletionFailure;
        }

        invalidateSessions(linkedAccount.getCorreo());
        return true;
    }

    public static void main(String[] args) throws Exception {
        int port = Integer.getInteger("senior.manage.port", 8080);
        new EnvironmentJwtConfiguration().validateForStartup();
        SeniorManageApiServer application = new SeniorManageApiServer();
        String databaseIssue = application.databaseReadinessIssue();
        if (databaseIssue != null) {
            throw new IllegalStateException(databaseIssue);
        }
        HttpServer server = HttpServer.create(
            new InetSocketAddress(InetAddress.getByName("127.0.0.1"), port),
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
                String databaseIssue = databaseReadinessIssue();
                if (databaseIssue != null) {
                    sendError(exchange, 503, databaseIssue);
                } else {
                    sendJson(exchange, 200, "{\"status\":\"ok\",\"database\":\"connected\",\"schema\":\"ready\",\"permissions\":\"initialized\"}");
                }
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
                        + ",\"mustChangePassword\":" + session.mustChangePassword
                        + "}");
                    return;
                }
                if ("POST".equals(method) && "/api/auth/change-password".equals(path)) {
                    changePassword(exchange, session);
                    return;
                }
                if ("POST".equals(method) && "/api/auth/logout".equals(path)) {
                    sessionRepository.revocar(session.tokenId);
                    sendMessage(exchange, 200, "Sesión cerrada.");
                    return;
                }
            }

            String[] segments = path.substring("/api/".length()).split("/");
            if (segments.length == 1 && "mi-perfil-profesional".equals(segments[0])) {
                Session session = requireSession(exchange);
                if (session != null) handleMyProfessionalProfile(exchange, method, session);
                return;
            }
            if (segments.length > 0 && "profesionales".equals(segments[0])) {
                Session session = authorizeModule(exchange, method, Module.PROFESSIONALS);
                if (session != null) {
                    handleProfessionals(exchange, method, segments, session);
                }
                return;
            }
            if (segments.length > 0 && "usuarios".equals(segments[0])) {
                Session session = authorizeModule(exchange, method, Module.USERS);
                if (session != null) {
                    handleUsers(exchange, method, segments, session);
                }
                return;
            }
            if (segments.length > 0 && "permisos".equals(segments[0])) {
                Session session = requireSession(exchange);
                if (session != null) handlePermissionConfiguration(exchange, method, segments, session);
                return;
            }
            if (segments.length > 0 && ("pacientes".equals(segments[0]) || "antecedentes".equals(segments[0]))) {
                Session session = requireSession(exchange);
                if (session != null) handlePatientRoutes(exchange, method, segments, session);
                return;
            }
            if (segments.length > 0 && ("citas".equals(segments[0]) || "ejercicios".equals(segments[0]))) {
                Session session = requireSession(exchange);
                if (session != null) handleClinicalFollowUp(exchange, method, segments, "citas".equals(segments[0]), session);
                return;
            }
            sendError(exchange, 404, "Ruta no encontrada.");
        } catch (IllegalArgumentException exception) {
            sendError(exchange, 400, exception.getMessage());
        } catch (PersistenceException exception) {
            logFailure("Persistencia", exception);
            sendError(exchange, 503, "La persistencia no está disponible.");
        } catch (SecurityException exception) {
            sendError(exchange, 403, exception.getMessage());
        } catch (Exception exception) {
            logFailure("Error interno", exception);
            sendError(exchange, 500, "Error interno del servidor.");
        } finally {
            exchange.close();
        }
    }

    private void logFailure(String category, Throwable failure) {
        Throwable current = failure;
        int causeLevel = 0;
        while (current != null && causeLevel < 5) {
            System.err.println(category + " (causa " + causeLevel + "): " + current.getClass().getName());
            if (current instanceof SQLException sqlFailure) {
                System.err.println("SQLState=" + sqlFailure.getSQLState() + ", codigo=" + sqlFailure.getErrorCode());
            }
            for (StackTraceElement frame : current.getStackTrace()) {
                String className = frame.getClassName();
                if (className.startsWith("presentation.")
                        || className.startsWith("application.")
                        || className.startsWith("infrastructure.")) {
                    System.err.println("  at " + frame);
                }
            }
            current = current.getCause();
            causeLevel++;
        }
    }

    private String databaseReadinessIssue() {
        if (!databaseConfiguration.isConfigured()) {
            return "Falta configurar la conexión externa de PostgreSQL.";
        }
        try (Connection connection = jdbcConnections.open()) {
            try (PreparedStatement migrationQuery = connection.prepareStatement(
                    "SELECT COUNT(DISTINCT version) FROM flyway_schema_history WHERE success = TRUE AND version IN ('1', '2', '3', '4', '5', '6')");
                 ResultSet migrations = migrationQuery.executeQuery()) {
                if (!migrations.next() || migrations.getInt(1) != 6) {
                    return "El esquema de Senior-Manage no está completo; aplica las migraciones Flyway V1, V2, V3, V4, V5 y V6.";
                }
            }
            try (PreparedStatement bootstrapQuery = connection.prepareStatement(
                    "SELECT EXISTS (SELECT 1 FROM permission_bootstrap_state WHERE singleton = TRUE), (SELECT COUNT(*) FROM permisos_rol)");
                 ResultSet bootstrap = bootstrapQuery.executeQuery()) {
                if (!bootstrap.next() || !bootstrap.getBoolean(1) || bootstrap.getLong(2) == 0) {
                    return "La matriz de permisos aprobada aún no se inicializó en esta base de datos.";
                }
            }
        } catch (SQLException failure) {
            return "PostgreSQL no está disponible o el esquema requerido no se puede consultar.";
        }
        return null;
    }

    private void login(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendError(exchange, 405, "Método no permitido.");
            return;
        }
        Map<String, String> form = readForm(exchange);
        LoginService.LoginResult result = loginService.authenticate(form.get("email"), form.get("password"));
        if (result == null) {
            sendError(exchange, 401, "Credenciales inválidas o cuenta inactiva.");
            return;
        }

        Usuario user = result.user();
        Session session = new Session(
            result.tokenId(),
            user.getCorreo(),
            user.getNombre(),
            user.getRol(),
            result.mustChangePassword()
        );
        sessionRepository.registrar(session.tokenId, user.getCorreo(), java.time.Instant.now().plus(jwtConfiguration.getTokenLifetime()));
        sendJson(exchange, 200,
            "{\"token\":" + json(result.token())
            + ",\"email\":" + json(user.getCorreo())
            + ",\"name\":" + json(user.getNombre())
            + ",\"role\":" + json(roleForClient(user.getRol()))
            + ",\"mustChangePassword\":" + session.mustChangePassword
            + "}");
    }

    private void changePassword(HttpExchange exchange, Session session) throws IOException {
        Map<String, String> form = readForm(exchange);
        String password = required(form, "password");
        String confirmation = required(form, "confirmation");
        if (password.length() < 8) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres.");
        }
        if (!password.equals(confirmation)) {
            throw new IllegalArgumentException("Las contraseñas no coinciden.");
        }
        sessionRepository.revocarOtras(session.email, session.tokenId);
        if (!users.cambiarPassword(session.email, password)) {
            sendError(exchange, 404, "No se pudo actualizar la contraseña de la cuenta.");
            return;
        }

        sendMessage(exchange, 200, "Contraseña actualizada.");
    }

    private void handleMyProfessionalProfile(HttpExchange exchange, String method, Session session) throws IOException {
        if (session.role != Rol.PROFESIONAL) {
            sendError(exchange, 403, "Este espacio es exclusivo para cuentas profesionales.");
            return;
        }
        Usuario account = users.buscarUsuarioPorCorreo(session.email);
        if (account == null || !account.isActivo() || account.getRol() != Rol.PROFESIONAL) {
            sendError(exchange, 403, "La cuenta profesional no está activa.");
            return;
        }
        Profesional profile = findProfessionalProfileByAccount(account);
        if ("GET".equals(method)) {
            sendJson(exchange, 200, serializeMyProfessionalProfile(account, profile));
            return;
        }
        if (!"PUT".equals(method)) {
            sendError(exchange, 405, "Método no permitido para la ficha profesional.");
            return;
        }
        Map<String, String> form = readForm(exchange);
        String document = boundedText(form, "document", 40, true);
        String phone = boundedText(form, "phone", 40, true);
        String specialty = boundedText(form, "specialty", 120, true);
        String license = boundedText(form, "licenseNumber", 100, true);
        String education = boundedText(form, "education", 300, true);
        String experience = boundedText(form, "experience", 2000, false);
        String biography = boundedText(form, "biography", 2000, false);

        Profesional sameDocument = professionalRepository.buscarPorDocumento(document);
        if (sameDocument != null && (profile == null || !sameDocument.getId().equals(profile.getId()))) {
            sendError(exchange, 409, "Ya existe una ficha profesional con ese documento.");
            return;
        }
        if (profile != null && profile.getCorreo().equalsIgnoreCase(account.getCorreo())
                && professionalRepository.buscarPorCuentaId(account.getId()) == null
                && !professionalRepository.vincularCuenta(profile.getDocumento(), account.getId())) {
            sendError(exchange, 409, "No se pudo vincular la ficha existente a esta cuenta.");
            return;
        }
        professionalRepository.guardarFichaPropia(account.getId(), account.getNombre(), account.getCorreo(),
            account.isActivo(), document, phone, specialty, license, education, experience, biography);
        sendJson(exchange, 200, serializeMyProfessionalProfile(account, findProfessionalProfileByAccount(account)));
    }

    private String boundedText(Map<String, String> form, String key, int maxLength, boolean required) {
        String value = form.getOrDefault(key, "").trim();
        if ((required && value.isEmpty()) || value.length() > maxLength || value.indexOf('\0') >= 0) {
            throw new IllegalArgumentException(required
                ? "El campo " + key + " es obligatorio y no puede superar " + maxLength + " caracteres."
                : "El campo " + key + " no puede superar " + maxLength + " caracteres.");
        }
        return value;
    }

    private String serializeMyProfessionalProfile(Usuario account, Profesional profile) {
        return "{\"exists\":" + (profile != null)
            + ",\"name\":" + json(account.getNombre())
            + ",\"document\":" + jsonOrEmpty(profile == null ? "" : profile.getDocumento())
            + ",\"email\":" + json(account.getCorreo())
            + ",\"phone\":" + jsonOrEmpty(profile == null ? "" : profile.getTelefono())
            + ",\"specialty\":" + jsonOrEmpty(profile == null ? "" : profile.getEspecialidad())
            + ",\"licenseNumber\":" + jsonOrEmpty(profile == null ? "" : profile.getRegistroProfesional())
            + ",\"education\":" + jsonOrEmpty(profile == null ? "" : profile.getFormacion())
            + ",\"experience\":" + jsonOrEmpty(profile == null ? "" : profile.getExperiencia())
            + ",\"biography\":" + jsonOrEmpty(profile == null ? "" : profile.getBiografia())
            + ",\"verificationStatus\":" + json(profile == null ? "SIN_PRESENTAR" : profile.getEstadoVerificacion())
            + ",\"reviewNote\":" + jsonOrEmpty(profile == null ? "" : profile.getNotaRevision()) + "}";
    }

    private void handleProfessionals(
            HttpExchange exchange,
            String method,
            String[] segments,
            Session session) throws IOException {

        if (segments.length == 1 && "GET".equals(method)) {
            sendJson(exchange, 200, serializeProfessionalDirectory());
            return;
        }
        if (segments.length == 1 && "POST".equals(method)) {
            Map<String, String> form = readForm(exchange);
            String document = requiredRecordField(form, "document");
            String email = normalizeEmail(requiredRecordField(form, "email"));
            String phone = requiredRecordField(form, "phone");
            Usuario account = users.buscarUsuarioPorCorreo(email);
            if (account == null || account.getRol() != Rol.PROFESIONAL) {
                sendError(exchange, 409, "Primero crea una cuenta con rol profesional en Usuarios y roles.");
                return;
            }
            if (professionalRepository.buscarPorCuentaId(account.getId()) != null) {
                sendError(exchange, 409, "Esta cuenta ya tiene una ficha profesional.");
                return;
            }
            if (professionals.buscarProfesionalPorDocumento(document) != null) {
                sendError(exchange, 409, "Ya existe un profesional con ese documento.");
                return;
            }
            Profesional profile = new Profesional(account.getNombre(), document, account.getCorreo(), phone);
            profile.setFichaProfesional(
                boundedText(form, "specialty", 120, true), boundedText(form, "licenseNumber", 100, true),
                boundedText(form, "education", 300, true), boundedText(form, "experience", 2000, false),
                boundedText(form, "biography", 2000, false), "SIN_PRESENTAR", null);
            profile.setActivo(account.isActivo());
            professionals.registrarProfesional(profile);
            sendMessage(exchange, 201, "Ficha profesional creada y vinculada a la cuenta.");
            return;
        }
        if (segments.length == 3
                && "cuenta".equals(segments[1])
                && "DELETE".equals(method)) {
            String email = normalizeEmail(decode(segments[2]));
            Usuario account = users.buscarUsuarioPorCorreo(email);
            if (account == null || account.getRol() != Rol.PROFESIONAL) {
                sendError(exchange, 404, "Cuenta profesional no encontrada.");
                return;
            }
            if (professionalRepository.buscarPorCuentaId(account.getId()) != null) {
                sendError(exchange, 409, "Elimina la cuenta desde su ficha profesional vinculada.");
                return;
            }
            if (!users.eliminarUsuarioPorCorreo(email)) {
                sendError(exchange, 404, "No se pudo eliminar la cuenta profesional.");
                return;
            }
            invalidateSessions(email);
            sendMessage(exchange, 200, "Cuenta profesional eliminada.");
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
                String requestedEmail = requiredRecordField(form, "email");
                String email = requestedEmail.equalsIgnoreCase(existing.getCorreo())
                    ? existing.getCorreo()
                    : validateEmail(requestedEmail);
                String phone = requiredRecordField(form, "phone");
                Usuario linkedAccount = users.buscarUsuarioPorCorreo(existing.getCorreo());
                if (linkedAccount != null && linkedAccount.getRol() == Rol.PROFESIONAL) {
                    name = linkedAccount.getNombre();
                    email = linkedAccount.getCorreo();
                }
                existing.setNombre(name);
                existing.setCorreo(email);
                existing.setTelefono(phone);
                existing.setFichaProfesional(
                    boundedText(form, "specialty", 120, true), boundedText(form, "licenseNumber", 100, true),
                    boundedText(form, "education", 300, true), boundedText(form, "experience", 2000, false),
                    boundedText(form, "biography", 2000, false), existing.getEstadoVerificacion(), existing.getNotaRevision());
                if (professionalRepository.actualizar(existing)) {
                    sendMessage(exchange, 200, "Profesional actualizado.");
                } else {
                    sendError(exchange, 404, "Profesional no encontrado.");
                }
            } else if (segments.length == 3 && "cuenta".equals(segments[2]) && "PATCH".equals(method)) {
                Map<String, String> form = readForm(exchange);
                String email = normalizeEmail(required(form, "email"));
                Usuario account = users.buscarUsuarioPorCorreo(email);
                if (account == null || account.getRol() != Rol.PROFESIONAL) {
                    sendError(exchange, 409, "Selecciona una cuenta existente con rol profesional.");
                    return;
                }
                if (account.getCorreo().equalsIgnoreCase(existing.getCorreo())) {
                    sendMessage(exchange, 200, "La ficha ya está vinculada a esta cuenta.");
                    return;
                }
                if (professionalRepository.buscarPorCuentaId(account.getId()) != null) {
                    sendError(exchange, 409, "Esta cuenta ya tiene otra ficha profesional vinculada.");
                    return;
                }
                if (!professionals.editarProfesional(
                        document,
                        account.getNombre(),
                        account.getCorreo(),
                        existing.getTelefono())) {
                    sendError(exchange, 404, "No se pudo vincular la ficha profesional.");
                    return;
                }
                if (!professionalRepository.vincularCuenta(document, account.getId())) {
                    sendError(exchange, 409, "No se pudo establecer el vínculo estable entre cuenta y ficha.");
                    return;
                }
                if (!professionals.cambiarEstadoProfesional(document, account.isActivo())) {
                    sendError(exchange, 500, "La ficha se vinculó, pero no se pudo sincronizar su estado.");
                    return;
                }
                sendMessage(exchange, 200, "Ficha vinculada a la cuenta profesional.");
            } else if (segments.length == 3 && "verificacion".equals(segments[2]) && "PATCH".equals(method)) {
                Map<String, String> form = readForm(exchange);
                String status = required(form, "status").toUpperCase(Locale.ROOT);
                if (!Set.of("VERIFICADA", "REQUIERE_CAMBIOS").contains(status)) {
                    throw new IllegalArgumentException("Selecciona Verificada o Requiere cambios.");
                }
                String note = form.getOrDefault("note", "").trim();
                if (note.length() > 2000 || note.indexOf('\0') >= 0) {
                    throw new IllegalArgumentException("La nota de revisión no puede superar 2000 caracteres.");
                }
                if ("REQUIERE_CAMBIOS".equals(status) && note.isBlank()) {
                    throw new IllegalArgumentException("Escribe qué debe corregir el profesional.");
                }
                if ("VERIFICADA".equals(status)
                        && (existing.getDocumento().isBlank() || existing.getTelefono() == null || existing.getTelefono().isBlank()
                            || existing.getEspecialidad() == null || existing.getEspecialidad().isBlank()
                            || existing.getRegistroProfesional() == null || existing.getRegistroProfesional().isBlank()
                            || existing.getFormacion() == null || existing.getFormacion().isBlank())) {
                    sendError(exchange, 409, "El profesional debe enviar documento, teléfono, especialidad, registro y formación antes de verificar la ficha.");
                    return;
                }
                Usuario reviewer = users.buscarUsuarioPorCorreo(session.email);
                if (reviewer == null || !professionalRepository.revisarFicha(existing.getId(), reviewer.getId(), status, note)) {
                    sendError(exchange, 404, "No se pudo guardar la revisión de la ficha.");
                    return;
                }
                sendMessage(exchange, 200, "Revisión de ficha guardada.");
            } else if (segments.length == 3 && "estado".equals(segments[2]) && "PATCH".equals(method)) {
                boolean active = parseBoolean(required(readForm(exchange), "active"));
                Usuario linkedAccount = users.buscarUsuarioPorCorreo(existing.getCorreo());
                if (linkedAccount != null && linkedAccount.getRol() == Rol.PROFESIONAL) {
                    boolean changed = active
                        ? users.activarUsuario(linkedAccount.getCorreo())
                        : users.desactivarUsuario(linkedAccount.getCorreo());
                    if (!changed) {
                        sendError(exchange, 404, "No se pudo actualizar el estado de la cuenta profesional.");
                        return;
                    }
                    sincronizarFichaProfesional(
                        linkedAccount.getCorreo(),
                        users.buscarUsuarioPorCorreo(linkedAccount.getCorreo()));
                } else if (!professionals.cambiarEstadoProfesional(document, active)) {
                    sendError(exchange, 404, "No se pudo actualizar el estado de la ficha profesional.");
                    return;
                }
                sendMessage(exchange, 200, "Estado actualizado.");
            } else if (segments.length == 2 && "DELETE".equals(method)) {
                Usuario linkedAccount = users.buscarUsuarioPorCorreo(existing.getCorreo());
                if (!eliminarProfesionalCompleto(document, linkedAccount)) {
                    sendError(exchange, 404, "Ficha profesional no encontrada.");
                    return;
                }
                if (linkedAccount != null && linkedAccount.getRol() == Rol.PROFESIONAL) {
                    sendMessage(exchange, 200, "Profesional, ficha y cuenta de acceso eliminados.");
                } else {
                    sendMessage(exchange, 200, "Ficha profesional eliminada.");
                }
            } else {
                sendError(exchange, 405, "Método no permitido.");
            }
            return;
        }
        sendError(exchange, 405, "Método no permitido.");
    }

    private String serializeProfessionalDirectory() {
        List<Profesional> profiles = professionals.consultarProfesionales();
        Set<String> linkedDocuments = new HashSet<>();
        StringBuilder json = new StringBuilder("[");
        boolean first = true;

        for (Usuario account : users.listarUsuarios()) {
            if (account.getRol() != Rol.PROFESIONAL) {
                continue;
            }
            Profesional profile = professionalRepository.buscarPorCuentaId(account.getId());
            if (profile == null) profile = findProfessionalProfileByEmail(profiles, account.getCorreo());
            if (profile != null) {
                linkedDocuments.add(profile.getDocumento());
            }
            if (!first) {
                json.append(',');
            }
            json.append(serializeProfessionalAccount(account, profile));
            first = false;
        }

        for (Profesional profile : profiles) {
            if (linkedDocuments.contains(profile.getDocumento())) {
                continue;
            }
            if (!first) {
                json.append(',');
            }
            json.append(serializeUnlinkedProfessionalProfile(profile));
            first = false;
        }

        return json.append(']').toString();
    }

    private Profesional findProfessionalProfileByEmail(String email) {
        return findProfessionalProfileByEmail(professionals.consultarProfesionales(), email);
    }

    private Profesional findProfessionalProfileByAccount(Usuario account) {
        if (account == null) return null;
        Profesional linked = professionalRepository.buscarPorCuentaId(account.getId());
        return linked != null ? linked : findProfessionalProfileByEmail(account.getCorreo());
    }

    private Profesional findProfessionalProfileByEmail(List<Profesional> profiles, String email) {
        for (Profesional profile : profiles) {
            if (profile.getCorreo().equalsIgnoreCase(email)) {
                return profile;
            }
        }
        return null;
    }

    private void sincronizarFichaProfesional(String correoAnterior, Usuario cuenta) {
        Profesional profile = cuenta == null
            ? findProfessionalProfileByEmail(correoAnterior)
            : professionalRepository.buscarPorCuentaId(cuenta.getId());
        if (profile == null) {
            return;
        }

        if (!professionals.editarProfesional(
                profile.getDocumento(),
                cuenta.getNombre(),
                cuenta.getCorreo(),
                profile.getTelefono())) {
            throw new IllegalStateException("No se pudo sincronizar la ficha profesional con la cuenta.");
        }
        if (profile.isActivo() != cuenta.isActivo()
                && !professionals.cambiarEstadoProfesional(
                    profile.getDocumento(),
                    cuenta.isActivo())) {
            throw new IllegalStateException("No se pudo sincronizar el estado de la ficha profesional.");
        }
    }

    private String serializeProfessionalAccount(Usuario account, Profesional profile) {
        return "{\"id\":" + json(profile == null ? "" : profile.getId().toString())
            + ",\"accountId\":" + json(account.getId().toString())
            + ",\"name\":" + json(account.getNombre())
            + ",\"document\":" + json(profile == null ? "" : profile.getDocumento())
            + ",\"email\":" + json(account.getCorreo())
            + ",\"phone\":" + jsonOrEmpty(profile == null ? "" : profile.getTelefono())
            + ",\"active\":" + account.isActivo()
            + ",\"accountActive\":" + account.isActivo()
            + ",\"profileActive\":" + (profile == null ? "null" : Boolean.toString(profile.isActivo()))
            + ",\"accountLinked\":true"
            + ",\"hasProfile\":" + (profile != null)
            + ",\"specialty\":" + jsonOrEmpty(profile == null ? "" : profile.getEspecialidad())
            + ",\"licenseNumber\":" + jsonOrEmpty(profile == null ? "" : profile.getRegistroProfesional())
            + ",\"education\":" + jsonOrEmpty(profile == null ? "" : profile.getFormacion())
            + ",\"experience\":" + jsonOrEmpty(profile == null ? "" : profile.getExperiencia())
            + ",\"biography\":" + jsonOrEmpty(profile == null ? "" : profile.getBiografia())
            + ",\"verificationStatus\":" + json(profile == null ? "SIN_PRESENTAR" : profile.getEstadoVerificacion())
            + ",\"reviewNote\":" + jsonOrEmpty(profile == null ? "" : profile.getNotaRevision())
            + "}";
    }

    private String serializeUnlinkedProfessionalProfile(Profesional profile) {
        return "{\"id\":" + json(profile.getId().toString())
            + ",\"accountId\":null"
            + ",\"name\":" + json(profile.getNombre())
            + ",\"document\":" + json(profile.getDocumento())
            + ",\"email\":" + json(profile.getCorreo())
            + ",\"phone\":" + jsonOrEmpty(profile.getTelefono())
            + ",\"active\":" + profile.isActivo()
            + ",\"accountActive\":null"
            + ",\"profileActive\":" + profile.isActivo()
            + ",\"accountLinked\":false"
            + ",\"hasProfile\":true"
            + ",\"specialty\":" + jsonOrEmpty(profile.getEspecialidad())
            + ",\"licenseNumber\":" + jsonOrEmpty(profile.getRegistroProfesional())
            + ",\"education\":" + jsonOrEmpty(profile.getFormacion())
            + ",\"experience\":" + jsonOrEmpty(profile.getExperiencia())
            + ",\"biography\":" + jsonOrEmpty(profile.getBiografia())
            + ",\"verificationStatus\":" + json(profile.getEstadoVerificacion())
            + ",\"reviewNote\":" + jsonOrEmpty(profile.getNotaRevision())
            + "}";
    }

    private void handleUsers(
            HttpExchange exchange,
            String method,
            String[] segments,
            Session session) throws IOException {

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
            String email = normalizeEmail(decode(segments[1]));
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
                String previousEmail = existing.getCorreo();
                users.actualizarUsuario(email, name, newEmail);
                sincronizarFichaProfesional(
                    previousEmail,
                    users.buscarUsuarioPorCorreo(newEmail));
                if (!email.equalsIgnoreCase(newEmail)) {
                    invalidateSessions(email);
                }
                sendMessage(exchange, 200, "Usuario actualizado.");
            } else if (segments.length == 3 && "password".equals(segments[2]) && "PUT".equals(method)) {
                if (session.email.equalsIgnoreCase(email)) {
                    sendError(exchange, 409, "Usa la opción de cambio de contraseña de tu propia cuenta.");
                    return;
                }
                String password = required(readForm(exchange), "password");
                if (password.length() < 8) {
                    throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres.");
                }
                if (!users.establecerPassword(email, password)) {
                    sendError(exchange, 404, "No se pudo actualizar la contraseña de la cuenta.");
                    return;
                }
                invalidateSessions(email);
                sendMessage(exchange, 200, "Contraseña actualizada. La cuenta debe iniciar sesión de nuevo.");
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
                sincronizarFichaProfesional(email, users.buscarUsuarioPorCorreo(email));
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
                sincronizarFichaProfesional(email, users.buscarUsuarioPorCorreo(email));
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
                if (existing.getRol() == Rol.PROFESIONAL) {
                    Profesional linkedProfile = professionalRepository.buscarPorCuentaId(existing.getId());
                    if (linkedProfile != null) {
                        if (!eliminarProfesionalCompleto(linkedProfile.getDocumento(), existing)) {
                            sendError(exchange, 404, "No se pudo eliminar el profesional y su ficha.");
                            return;
                        }
                        invalidateSessions(email);
                        sendMessage(exchange, 200, "Profesional, ficha y cuenta de acceso eliminados.");
                        return;
                    }
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

    private void handlePermissionConfiguration(
            HttpExchange exchange, String method, String[] segments, Session session) throws IOException {
        if (session.role != Rol.ADMINISTRADOR) {
            sendError(exchange, 403, "Solo un administrador puede modificar la configuración de permisos.");
            return;
        }
        if (!databaseConfiguration.isConfigured()) {
            sendError(exchange, 503, "La configuración externa de PostgreSQL no está completa.");
            return;
        }
        String requiredOperation;
        if ("GET".equals(method)) requiredOperation = "READ";
        else if ("PUT".equals(method)) requiredOperation = "READ";
        else { sendError(exchange, 405, "Método o ruta de permisos no permitido."); return; }
        if (!authorization.isAllowed(session.role, "PERMISOS", requiredOperation, permissionRepository)) {
            sendError(exchange, 403, "La configur�n de permisos no autoriza esta operaci�n.");
            return;
        }
        if (segments.length == 2 && "GET".equals(method)) {
            Rol target = parseRole(decode(segments[1]));
            sendJson(exchange, 200, serializePermissions(permissionManagement.listar(session.role, target)));
            return;
        }
        if (segments.length == 4 && "PUT".equals(method)) {
            Rol target = parseRole(decode(segments[1]));
            String module = decode(segments[2]);
            String operation = decode(segments[3]);
            boolean allowed = parseBoolean(required(readForm(exchange), "allowed"));
            permissionManagement.guardarPermisoProfesional(session.role, target, new Permiso(module, operation, allowed));
            sendMessage(exchange, 200, "Permiso actualizado.");
            return;
        }
        sendError(exchange, 405, "Método o ruta de permisos no permitido.");
    }

    private boolean requireVerifiedProfessional(HttpExchange exchange, Session session) throws IOException {
        if (session.role != Rol.PROFESIONAL) return true;
        Usuario account = users.buscarUsuarioPorCorreo(session.email);
        Profesional profile = findProfessionalProfileByAccount(account);
        if (profile == null || !"VERIFICADA".equals(profile.getEstadoVerificacion())) {
            sendError(exchange, 403, "Completa tu ficha profesional y espera la verificación del administrador para acceder a pacientes, citas y ejercicios.");
            return false;
        }
        return true;
    }

    private void handleClinicalFollowUp(HttpExchange exchange, String method, String[] segments, boolean appointments, Session session) throws IOException {
        if (!requireVerifiedProfessional(exchange, session)) return;
        String module = appointments ? "CITAS" : "EJERCICIOS";
        String operation = method.equals("GET") ? "READ" : method.equals("POST") ? "CREATE" : method.equals("DELETE") ? "DELETE" : "UPDATE";
        if (session.role == Rol.ADMINISTRADOR && !appointments && !"READ".equals(operation)) {
            sendError(exchange, 403, "El administrador tiene acceso de solo lectura a ejercicios."); return;
        }
        if (!authorization.isAllowed(session.role, module, operation, permissionRepository)) {
            sendError(exchange, 403, "La configuración de permisos no autoriza esta operación."); return;
        }
        if (!appointments && "DELETE".equals(operation)) { sendError(exchange, 405, "No se permite eliminar seguimientos clínicos."); return; }
        if ("GET".equals(method) && segments.length == 1) {
            String sql = appointments
                ? "SELECT c.id,c.paciente_id,p.nombre_completo,c.profesional_id,pr.nombre,c.fecha_hora,c.motivo,c.estado FROM citas c JOIN pacientes p ON p.id=c.paciente_id JOIN profesionales pr ON pr.id=c.profesional_id "
                : "SELECT m.id,m.paciente_id,p.nombre_completo,NULL::uuid,NULL::text,m.registrado_en,m.ejercicio,m.notas FROM seguimientos_ejercicios m JOIN pacientes p ON p.id=m.paciente_id ";
            if (session.role == Rol.PROFESIONAL) sql += appointments
                ? "JOIN usuarios u ON u.correo_normalizado=lower(trim(?)) AND u.id=pr.usuario_id WHERE pr.activo AND u.activo AND EXISTS (SELECT 1 FROM asignaciones_profesional_paciente a WHERE a.paciente_id=c.paciente_id AND a.profesional_id=pr.id AND a.estado='ACTIVA' AND a.fecha_fin IS NULL) "
                : "WHERE EXISTS (SELECT 1 FROM asignaciones_profesional_paciente a JOIN profesionales pr ON pr.id=a.profesional_id JOIN usuarios u ON u.id=pr.usuario_id WHERE a.paciente_id=m.paciente_id AND lower(trim(u.correo))=lower(trim(?)) AND u.activo AND pr.activo AND a.estado='ACTIVA' AND a.fecha_fin IS NULL) ";
            sql += appointments ? "ORDER BY c.fecha_hora DESC" : "ORDER BY m.registrado_en DESC";
            try (Connection c = jdbcConnections.open(); PreparedStatement q = c.prepareStatement(sql)) {
                if (session.role == Rol.PROFESIONAL) q.setString(1, session.email);
                try (ResultSet rows = q.executeQuery()) {
                    StringBuilder out = new StringBuilder("["); boolean first = true;
                    while (rows.next()) {
                        if (!first) out.append(','); first = false;
                        out.append("{\"id\":").append(json(rows.getString(1))).append(",\"patientId\":").append(json(rows.getString(2)))
                            .append(",\"patientName\":").append(json(rows.getString(3)));
                        if (appointments) out.append(",\"professionalId\":").append(json(rows.getString(4))).append(",\"professionalName\":").append(json(rows.getString(5)));
                        out.append(",\"date\":").append(json(rows.getString(6))).append(",\"item\":").append(json(rows.getString(7)))
                            .append(",\"notes\":").append(json(rows.getString(8))).append('}');
                    }
                    sendJson(exchange, 200, out.append(']').toString());
                }
            } catch (SQLException e) { throw new PersistenceException("No se pudieron consultar los registros clínicos.", e); }
            return;
        }
        if (!appointments && "GET".equals(method) && segments.length == 3 && "catalogo".equals(segments[1])) {
            UUID patientId = UUID.fromString(segments[2]);
            if (!activePatient(patientId)) { sendError(exchange, 404, "Paciente activo no encontrado."); return; }
            if (session.role == Rol.PROFESIONAL && !currentlyAssigned(session.email, patientId)) {
                sendError(exchange, 403, "Solo puedes consultar ejercicios para un paciente asignado actualmente a tu cuenta."); return;
            }
            sendJson(exchange, 200, serializeExerciseCatalog(patientId));
            return;
        }
        if (!appointments && "GET".equals(method) && segments.length == 2 && "planes".equals(segments[1])) {
            sendJson(exchange, 200, serializeExercisePlans(session));
            return;
        }
        if (!appointments && "POST".equals(method) && segments.length == 2 && "planes".equals(segments[1])) {
            createExercisePlan(exchange, session);
            return;
        }
        if (!appointments && "POST".equals(method) && segments.length == 1) {
            sendError(exchange, 405, "Usa el catálogo y la ruta de planes para validar alertas clínicas antes de asignar ejercicios.");
            return;
        }
        if ("POST".equals(method) && segments.length == 1) {
            Map<String,String> form = readForm(exchange); UUID patientId = UUID.fromString(required(form,"patientId"));
            String professionalId = appointments ? form.get("professionalId") : null;
            UUID actor = accountId(session.email);
            if (appointments && session.role == Rol.PROFESIONAL) professionalId = professionalIdFor(session.email);
            if (session.role == Rol.PROFESIONAL && !currentlyAssigned(session.email, patientId)) { sendError(exchange,403,"El paciente no está asignado actualmente a tu cuenta."); return; }
            if (appointments) {
                if (professionalId == null || professionalId.isBlank()) { sendError(exchange,400,"Selecciona un profesional."); return; }
                if (session.role == Rol.ADMINISTRADOR && !isActiveAssignment(patientId, UUID.fromString(professionalId))) { sendError(exchange,400,"La cita requiere un paciente activo asignado a un profesional activo."); return; }
                String sql="INSERT INTO citas(id,paciente_id,profesional_id,fecha_hora,motivo,creado_por) VALUES(?,?,?,?::timestamptz,?,?) RETURNING id";
                try(Connection c=jdbcConnections.open();PreparedStatement q=c.prepareStatement(sql)){q.setObject(1,UUID.randomUUID());q.setObject(2,patientId);q.setObject(3,UUID.fromString(professionalId));q.setString(4,required(form,"date"));q.setString(5,required(form,"item"));q.setObject(6,actor);q.executeQuery().close();sendMessage(exchange,201,"Cita creada.");}
                catch(SQLException e){throw new PersistenceException("No se pudo crear la cita.",e);}
            } else {
                String sql="INSERT INTO seguimientos_ejercicios(id,paciente_id,ejercicio,notas,registrado_por) VALUES(?,?,?,?,?)";
                try(Connection c=jdbcConnections.open();PreparedStatement q=c.prepareStatement(sql)){q.setObject(1,UUID.randomUUID());q.setObject(2,patientId);q.setString(3,required(form,"item"));q.setString(4,required(form,"notes"));q.setObject(5,actor);q.executeUpdate();sendMessage(exchange,201,"Ejercicio registrado.");}
                catch(SQLException e){throw new PersistenceException("No se pudo registrar el ejercicio.",e);}
            }
            return;
        }
        if (segments.length == 2 && ("PUT".equals(method) || (appointments && "DELETE".equals(method)))) {
            UUID id=UUID.fromString(segments[1]); Map<String,String> form="DELETE".equals(method)?Map.of("status","CANCELADA"):readForm(exchange);
            if(appointments){String sql="UPDATE citas c SET fecha_hora=COALESCE(?::timestamptz,c.fecha_hora), motivo=COALESCE(?,c.motivo), estado=COALESCE(?,c.estado) WHERE c.id=? AND (?='ADMINISTRADOR' OR EXISTS(SELECT 1 FROM asignaciones_profesional_paciente a JOIN profesionales pr ON pr.id=a.profesional_id JOIN usuarios u ON u.id=pr.usuario_id WHERE a.paciente_id=c.paciente_id AND a.profesional_id=c.profesional_id AND pr.activo AND u.activo AND lower(trim(u.correo))=lower(trim(?)) AND a.estado='ACTIVA' AND a.fecha_fin IS NULL))";
                if (form.containsKey("status") && !Set.of("PROGRAMADA", "COMPLETADA", "CANCELADA").contains(form.get("status"))) { sendError(exchange,400,"Estado de cita no válido."); return; }
                try(Connection c=jdbcConnections.open();PreparedStatement q=c.prepareStatement(sql)){q.setString(1,form.get("date"));q.setString(2,form.get("item"));q.setString(3,form.get("status"));q.setObject(4,id);q.setString(5,session.role.name());q.setString(6,session.email);if(q.executeUpdate()==0){sendError(exchange,404,"Cita inexistente o fuera de tu asignación activa.");return;}sendMessage(exchange,200,"Cita actualizada.");}catch(SQLException e){throw new PersistenceException("No se pudo actualizar la cita.",e);}
            } else {sendError(exchange,405,"El seguimiento no admite modificación por esta ruta.");}
            return;
        }
        sendError(exchange,405,"Método o ruta no permitidos.");
    }

    private String serializeExerciseCatalog(UUID patientId) {
        List<String> conditions = new java.util.ArrayList<>();
        try (Connection c = jdbcConnections.open(); PreparedStatement q = c.prepareStatement(
                "SELECT tipo, descripcion FROM antecedentes WHERE paciente_id = ?")) {
            q.setObject(1, patientId);
            try (ResultSet r = q.executeQuery()) {
                while (r.next()) conditions.add(normalizeClinicalText(r.getString(1) + " " + r.getString(2)));
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudieron revisar las alertas clínicas.", e); }

        StringBuilder out = new StringBuilder("[");
        try (Connection c = jdbcConnections.open(); PreparedStatement q = c.prepareStatement(
                "SELECT id, nombre, categoria, descripcion, restricciones_clinicas FROM catalogo_ejercicios WHERE activo ORDER BY categoria, nombre");
             ResultSet r = q.executeQuery()) {
            boolean first = true;
            while (r.next()) {
                java.sql.Array sqlTerms = r.getArray("restricciones_clinicas");
                Object[] terms = sqlTerms == null ? new Object[0] : (Object[]) sqlTerms.getArray();
                java.util.LinkedHashSet<String> matches = new java.util.LinkedHashSet<>();
                for (Object term : terms) {
                    String normalizedTerm = normalizeClinicalText(String.valueOf(term));
                    if (!normalizedTerm.isBlank() && conditions.stream().anyMatch(value -> value.contains(normalizedTerm))) {
                        matches.add(String.valueOf(term));
                    }
                }
                if (!first) out.append(',');
                first = false;
                out.append("{\"id\":").append(json(r.getString("id")))
                    .append(",\"name\":").append(json(r.getString("nombre")))
                    .append(",\"category\":").append(json(r.getString("categoria")))
                    .append(",\"description\":").append(json(r.getString("descripcion")))
                    .append(",\"blocked\":").append(!matches.isEmpty())
                    .append(",\"alerts\":").append(jsonArray(matches)).append('}');
                if (sqlTerms != null) sqlTerms.free();
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo consultar el catálogo de ejercicios.", e); }
        return out.append(']').toString();
    }

    private static String normalizeClinicalText(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    private String jsonArray(java.util.Collection<String> values) {
        StringBuilder out = new StringBuilder("[");
        boolean first = true;
        for (String value : values) { if (!first) out.append(','); first = false; out.append(json(value)); }
        return out.append(']').toString();
    }

    private boolean activePatient(UUID patientId) {
        try (Connection c = jdbcConnections.open(); PreparedStatement q = c.prepareStatement("SELECT activo FROM pacientes WHERE id = ?")) {
            q.setObject(1, patientId);
            try (ResultSet r = q.executeQuery()) { return r.next() && r.getBoolean(1); }
        } catch (SQLException e) { throw new PersistenceException("No se pudo validar el paciente.", e); }
    }

    private void createExercisePlan(HttpExchange exchange, Session session) throws IOException {
        Map<String, String> form = readForm(exchange);
        UUID patientId = UUID.fromString(required(form, "patientId"));
        String exerciseId = required(form, "exerciseId");
        if (!activePatient(patientId)) { sendError(exchange, 404, "Paciente activo no encontrado."); return; }
        if (session.role == Rol.PROFESIONAL && !currentlyAssigned(session.email, patientId)) {
            sendError(exchange, 403, "Solo puedes asignar ejercicios a un paciente actualmente asignado a tu cuenta."); return;
        }
        String details = exerciseAlerts(patientId, exerciseId);
        if (details == null) { sendError(exchange, 404, "Ejercicio no encontrado en el catálogo."); return; }
        if (!details.isBlank()) {
            sendError(exchange, 409, "Alerta clínica: no asignes este ejercicio. Coincide con antecedentes registrados (" + details + "); solicita valoración del profesional tratante.");
            return;
        }
        String frequency = boundedText(form, "frequency", 120, true);
        String notes = boundedText(form, "notes", 2000, false);
        Integer sets = optionalBoundedInteger(form, "sets", 1, 20);
        Integer repetitions = optionalBoundedInteger(form, "repetitions", 1, 200);
        Integer duration = optionalBoundedInteger(form, "durationMinutes", 1, 240);
        String sql = "INSERT INTO planes_ejercicios(id,paciente_id,ejercicio_id,frecuencia,series,repeticiones,duracion_minutos,indicaciones,asignado_por) "
            + "VALUES(?,?,?,?,?,?,?,?,?)";
        try (Connection c = jdbcConnections.open(); PreparedStatement q = c.prepareStatement(sql)) {
            q.setObject(1, UUID.randomUUID()); q.setObject(2, patientId); q.setString(3, exerciseId); q.setString(4, frequency);
            if (sets == null) q.setNull(5, java.sql.Types.SMALLINT); else q.setInt(5, sets);
            if (repetitions == null) q.setNull(6, java.sql.Types.SMALLINT); else q.setInt(6, repetitions);
            if (duration == null) q.setNull(7, java.sql.Types.SMALLINT); else q.setInt(7, duration);
            q.setString(8, notes); q.setObject(9, accountId(session.email)); q.executeUpdate();
        } catch (SQLException e) { throw new PersistenceException("No se pudo asignar el ejercicio.", e); }
        sendMessage(exchange, 201, "Ejercicio asignado al paciente.");
    }

    private String exerciseAlerts(UUID patientId, String exerciseId) {
        List<String> conditions = new java.util.ArrayList<>();
        try (Connection c = jdbcConnections.open(); PreparedStatement q = c.prepareStatement(
                "SELECT tipo, descripcion FROM antecedentes WHERE paciente_id = ?")) {
            q.setObject(1, patientId);
            try (ResultSet r = q.executeQuery()) { while (r.next()) conditions.add(normalizeClinicalText(r.getString(1) + " " + r.getString(2))); }
        } catch (SQLException e) { throw new PersistenceException("No se pudieron revisar las alertas clínicas.", e); }
        try (Connection c = jdbcConnections.open(); PreparedStatement q = c.prepareStatement(
                "SELECT restricciones_clinicas FROM catalogo_ejercicios WHERE id = ? AND activo")) {
            q.setString(1, exerciseId);
            try (ResultSet r = q.executeQuery()) {
                if (!r.next()) return null;
                java.sql.Array sqlTerms = r.getArray(1);
                Object[] terms = sqlTerms == null ? new Object[0] : (Object[]) sqlTerms.getArray();
                java.util.LinkedHashSet<String> matches = new java.util.LinkedHashSet<>();
                for (Object term : terms) {
                    String normalizedTerm = normalizeClinicalText(String.valueOf(term));
                    if (!normalizedTerm.isBlank() && conditions.stream().anyMatch(value -> value.contains(normalizedTerm))) matches.add(String.valueOf(term));
                }
                if (sqlTerms != null) sqlTerms.free();
                return String.join(", ", matches);
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudo validar el ejercicio.", e); }
    }

    private static Integer optionalBoundedInteger(Map<String, String> form, String key, int min, int max) {
        String value = form.getOrDefault(key, "").trim();
        if (value.isEmpty()) return null;
        try { int number = Integer.parseInt(value); if (number < min || number > max) throw new NumberFormatException(); return number; }
        catch (NumberFormatException e) { throw new IllegalArgumentException("El campo " + key + " debe estar entre " + min + " y " + max + "."); }
    }

    private String serializeExercisePlans(Session session) {
        String sql = "SELECT p.id,p.paciente_id,pa.nombre_completo,e.id,e.nombre,e.categoria,p.frecuencia,p.series,p.repeticiones,p.duracion_minutos,p.indicaciones,p.asignado_en "
            + "FROM planes_ejercicios p JOIN pacientes pa ON pa.id=p.paciente_id JOIN catalogo_ejercicios e ON e.id=p.ejercicio_id WHERE p.activo AND pa.activo ";
        if (session.role == Rol.PROFESIONAL) sql += "AND EXISTS(SELECT 1 FROM asignaciones_profesional_paciente a JOIN profesionales pr ON pr.id=a.profesional_id JOIN usuarios u ON u.id=pr.usuario_id WHERE a.paciente_id=p.paciente_id AND lower(trim(u.correo))=lower(trim(?)) AND u.activo AND pr.activo AND a.estado='ACTIVA' AND a.fecha_fin IS NULL) ";
        sql += "ORDER BY p.asignado_en DESC";
        try (Connection c = jdbcConnections.open(); PreparedStatement q = c.prepareStatement(sql)) {
            if (session.role == Rol.PROFESIONAL) q.setString(1, session.email);
            try (ResultSet r = q.executeQuery()) {
                StringBuilder out = new StringBuilder("["); boolean first = true;
                while (r.next()) {
                    if (!first) out.append(','); first = false;
                    out.append("{\"id\":").append(json(r.getString(1))).append(",\"patientId\":").append(json(r.getString(2)))
                        .append(",\"patientName\":").append(json(r.getString(3))).append(",\"exerciseId\":").append(json(r.getString(4)))
                        .append(",\"exerciseName\":").append(json(r.getString(5))).append(",\"category\":").append(json(r.getString(6)))
                        .append(",\"frequency\":").append(json(r.getString(7))).append(",\"sets\":").append(r.getObject(8) == null ? "null" : r.getInt(8))
                        .append(",\"repetitions\":").append(r.getObject(9) == null ? "null" : r.getInt(9))
                        .append(",\"durationMinutes\":").append(r.getObject(10) == null ? "null" : r.getInt(10))
                        .append(",\"notes\":").append(json(r.getString(11))).append(",\"date\":").append(json(r.getString(12))).append('}');
                }
                return out.append(']').toString();
            }
        } catch (SQLException e) { throw new PersistenceException("No se pudieron consultar los planes de ejercicios.", e); }
    }

    private UUID accountId(String email) {
        try(Connection c=jdbcConnections.open();PreparedStatement q=c.prepareStatement("SELECT id FROM usuarios WHERE correo_normalizado=lower(trim(?)) AND activo")){q.setString(1,email);try(ResultSet r=q.executeQuery()){if(r.next())return r.getObject(1,UUID.class);}}
        catch(SQLException e){throw new PersistenceException("No se pudo resolver la cuenta actual.",e);} throw new SecurityException("La cuenta no está activa.");
    }
    private String professionalIdFor(String email) {
        try(Connection c=jdbcConnections.open();PreparedStatement q=c.prepareStatement("SELECT pr.id FROM profesionales pr JOIN usuarios u ON u.id=pr.usuario_id WHERE u.correo_normalizado=lower(trim(?)) AND pr.activo AND u.activo")){q.setString(1,email);try(ResultSet r=q.executeQuery()){if(r.next())return r.getString(1);}}
        catch(SQLException e){throw new PersistenceException("No se pudo resolver el perfil profesional.",e);} throw new SecurityException("La cuenta no tiene un perfil profesional activo.");
    }
    private boolean currentlyAssigned(String email, UUID patientId) {
        try(Connection c=jdbcConnections.open();PreparedStatement q=c.prepareStatement("SELECT EXISTS(SELECT 1 FROM asignaciones_profesional_paciente a JOIN profesionales pr ON pr.id=a.profesional_id JOIN usuarios u ON u.id=pr.usuario_id JOIN pacientes p ON p.id=a.paciente_id WHERE a.paciente_id=? AND lower(trim(u.correo))=lower(trim(?)) AND u.activo AND pr.activo AND p.activo AND a.estado='ACTIVA' AND a.fecha_fin IS NULL)")){q.setObject(1,patientId);q.setString(2,email);try(ResultSet r=q.executeQuery()){return r.next()&&r.getBoolean(1);}}
        catch(SQLException e){throw new PersistenceException("No se pudo validar la asignación vigente.",e);}
    }
    private boolean isActiveAssignment(UUID patientId, UUID professionalId) {
        try(Connection c=jdbcConnections.open();PreparedStatement q=c.prepareStatement("SELECT EXISTS(SELECT 1 FROM asignaciones_profesional_paciente a JOIN pacientes p ON p.id=a.paciente_id JOIN profesionales pr ON pr.id=a.profesional_id JOIN usuarios u ON u.id=pr.usuario_id WHERE a.paciente_id=? AND a.profesional_id=? AND p.activo AND pr.activo AND u.activo AND a.estado='ACTIVA' AND a.fecha_fin IS NULL)")){q.setObject(1,patientId);q.setObject(2,professionalId);try(ResultSet r=q.executeQuery()){return r.next()&&r.getBoolean(1);}}
        catch(SQLException e){throw new PersistenceException("No se pudo validar la asignación del profesional.",e);}
    }

    private void handlePatientRoutes(HttpExchange exchange, String method, String[] segments, Session session) throws IOException {
        if (!requireVerifiedProfessional(exchange, session)) return;
        if (!databaseConfiguration.isConfigured()) {
            sendError(exchange, 503, "Falta la configuracion externa de PostgreSQL.");
            return;
        }
        boolean patientRoot = "pacientes".equals(segments[0]);
        if (patientRoot && segments.length == 2 && "asignaciones".equals(segments[1])) {
            handlePatientAssignmentDirectory(exchange, method, session);
            return;
        }
        if (patientRoot && segments.length == 3 && "asignacion".equals(segments[2])) {
            handleAssignmentRoute(exchange, method, segments, session);
            return;
        }
        if (patientRoot && segments.length == 2 && "historicos".equals(segments[1])) {
            handleHistoricalPatients(exchange, method, session);
            return;
        }

        String module;
        String operation;
        if (patientRoot && segments.length == 1) {
            module = "PACIENTES"; operation = "GET".equals(method) ? "READ" : "POST".equals(method) ? "CREATE" : null;
        } else if (patientRoot && segments.length == 2) {
            module = "PACIENTES"; operation = "GET".equals(method) ? "READ" : "PUT".equals(method) ? "UPDATE" : null;
        } else if (patientRoot && segments.length == 3 && "estado".equals(segments[2])) {
            module = "PACIENTES"; operation = "PATCH".equals(method) ? "DEACTIVATE" : null;
        } else if (patientRoot && segments.length == 3 && "antecedentes".equals(segments[2])) {
            module = "ANTECEDENTES"; operation = "GET".equals(method) ? "READ" : "POST".equals(method) ? "CREATE" : null;
        } else if (!patientRoot && segments.length == 2) {
            module = "ANTECEDENTES"; operation = "GET".equals(method) ? "READ" : "PUT".equals(method) ? "UPDATE" : null;
        } else {
            sendError(exchange, 404, "Ruta no encontrada."); return;
        }
        if (operation == null) { sendError(exchange, 405, "Metodo no permitido."); return; }
        if (session.role == Rol.PROFESIONAL && patientRoot && segments.length == 1 && "POST".equals(method)) {
            sendError(exchange, 403, "El registro de pacientes requiere una politica administrativa aprobada."); return;
        }
        String patientOperation = null;
        if (patientRoot && segments.length == 3 && "antecedentes".equals(segments[2]))
            patientOperation = "GET".equals(method) ? "READ" : "UPDATE";
        else if (!patientRoot && segments.length == 2)
            patientOperation = "GET".equals(method) ? "READ" : "UPDATE";
        if (patientOperation != null && !authorization.isAllowed(session.role, "PACIENTES", patientOperation, permissionRepository)) {
            sendError(exchange, 403, "La configuracion no autoriza la operacion sobre el paciente."); return;
        }
        if (!authorization.isAllowed(session.role, module, operation, permissionRepository)) {
            sendError(exchange, 403, "La configuracion no autoriza esta operacion."); return;
        }

        Paciente associatedPatient = null;
        Antecedente linkedHistory = null;
        if (patientRoot && (segments.length == 2 || (segments.length == 3 && "estado".equals(segments[2])))) {
            associatedPatient = patientManagement.buscar(UUID.fromString(decode(segments[1]))).orElse(null);
        } else if (patientRoot && segments.length == 3 && "antecedentes".equals(segments[2])) {
            associatedPatient = patientManagement.buscar(UUID.fromString(decode(segments[1]))).orElse(null);
        } else if (!patientRoot && segments.length == 2) {
            linkedHistory = historyManagement.buscar(UUID.fromString(decode(segments[1]))).orElse(null);
            if (linkedHistory != null) associatedPatient = patientManagement.buscar(linkedHistory.getPacienteId()).orElse(null);
        }
        if ((patientRoot && segments.length > 1 && associatedPatient == null)
                || (!patientRoot && segments.length == 2 && associatedPatient == null)) {
            sendError(exchange, 404, patientRoot ? "Paciente no encontrado." : "Antecedente no encontrado."); return;
        }
        if (associatedPatient != null && !associatedPatient.isActivo()) {
            if (!"GET".equals(method)) { sendError(exchange, 403, "Los pacientes inactivos son de solo lectura."); return; }
            if (!authorization.isAllowed(session.role, "PACIENTES", "HISTORY_READ", permissionRepository)) {
                sendError(exchange, 403, "La configuracion no autoriza la consulta historica."); return;
            }
        }
        if (session.role == Rol.PROFESIONAL && associatedPatient != null
                && !assignmentManagement.puedeAcceder(session.email, associatedPatient.getId())) {
            sendError(exchange, 403, "El paciente no esta asignado al profesional autenticado."); return;
        }

        if (patientRoot) {
            if (segments.length == 1 && "GET".equals(method)) {
                if (session.role == Rol.PROFESIONAL && !assignmentManagement.profesionalHabilitado(session.email)) {
                    sendError(exchange, 403, "La cuenta profesional no esta habilitada."); return;
                }
                List<Paciente> rows = session.role == Rol.PROFESIONAL
                    ? patientManagement.listarAsignados(session.email) : patientManagement.listar();
                sendJson(exchange, 200, serializePatients(rows));
            } else if (segments.length == 1 && "POST".equals(method)) {
                Map<String, String> form = readForm(exchange);
                try {
                    Paciente created = patientManagement.registrar(required(form, "fullName"), required(form, "document"),
                        optionalDate(form.get("birthDate")), form.get("phone"), form.get("address"), form.get("observations"));
                    sendJson(exchange, 201, serializePatient(created));
                } catch (DocumentoPacienteDuplicadoException duplicate) { sendError(exchange, 409, duplicate.getMessage()); }
                catch (IllegalStateException duplicate) { sendError(exchange, 409, duplicate.getMessage()); }
            } else if (segments.length == 2 && "GET".equals(method)) {
                sendJson(exchange, 200, serializePatient(associatedPatient));
            } else if (segments.length == 2 && "PUT".equals(method)) {
                Map<String, String> form = readForm(exchange);
                try {
                    boolean updated = patientManagement.actualizar(associatedPatient.getId(), required(form, "fullName"), required(form, "document"),
                        optionalDate(form.get("birthDate")), form.get("phone"), form.get("address"), form.get("observations"));
                    if (!updated) sendError(exchange, 404, "Paciente no encontrado.");
                    else sendJson(exchange, 200, serializePatient(patientManagement.buscar(associatedPatient.getId()).orElseThrow()));
                } catch (DocumentoPacienteDuplicadoException duplicate) { sendError(exchange, 409, duplicate.getMessage()); }
                catch (IllegalStateException invalid) { sendError(exchange, 409, invalid.getMessage()); }
            } else if (segments.length == 3 && "estado".equals(segments[2]) && "PATCH".equals(method)) {
                boolean changed = patientManagement.desactivar(UUID.fromString(decode(segments[1])));
                if (!changed) sendError(exchange, 404, "Paciente no encontrado o ya inactivo.");
                else sendMessage(exchange, 200, "Paciente desactivado; sus antecedentes se conservan.");
            } else if (segments.length == 3 && "antecedentes".equals(segments[2]) && "GET".equals(method)) {
                sendJson(exchange, 200, serializeAntecedents(historyManagement.listarPorPaciente(associatedPatient.getId())));
            } else if (segments.length == 3 && "antecedentes".equals(segments[2]) && "POST".equals(method)) {
                Map<String, String> form = readForm(exchange);
                try {
                    Antecedente created = historyManagement.registrar(associatedPatient.getId(), required(form, "type"),
                        required(form, "description"), requiredDate(form.get("date")));
                    sendJson(exchange, 201, serializeAntecedent(created));
                } catch (IllegalStateException blocked) { sendError(exchange, 403, blocked.getMessage()); }
            }
            return;
        }
        if ("GET".equals(method)) {
            sendJson(exchange, 200, serializeAntecedent(linkedHistory));
        } else if ("PUT".equals(method)) {
            Map<String, String> form = readForm(exchange);
            try {
                boolean updated = historyManagement.actualizar(linkedHistory.getId(), required(form, "type"),
                    required(form, "description"), requiredDate(form.get("date")));
                if (!updated) sendError(exchange, 404, "Antecedente no encontrado.");
                else sendJson(exchange, 200, serializeAntecedent(historyManagement.buscar(linkedHistory.getId()).orElseThrow()));
            } catch (IllegalStateException blocked) { sendError(exchange, 403, blocked.getMessage()); }
        }
    }

    private void handlePatientAssignmentDirectory(HttpExchange exchange, String method, Session session) throws IOException {
        if (!"GET".equals(method)) { sendError(exchange, 405, "Metodo no permitido."); return; }
        if (session.role != Rol.ADMINISTRADOR) { sendError(exchange, 403, "El listado agregado de asignaciones requiere rol administrador."); return; }
        if (!authorization.isAllowed(session.role, "PACIENTES", "READ", permissionRepository)
                || !authorization.isAllowed(session.role, "ASIGNACIONES", "READ", permissionRepository)) {
            sendError(exchange, 403, "La configuracion no autoriza la consulta agregada de asignaciones."); return;
        }

        Map<String, String> query = readQuery(exchange);
        for (String key : query.keySet()) {
            if (!Set.of("page", "size", "patientStatus", "assignmentStatus").contains(key)) {
                throw new IllegalArgumentException("Parametro de consulta no reconocido: " + key);
            }
        }
        int page = query.containsKey("page") ? parseNonNegativeInt(query.get("page"), "page") : 0;
        int size = query.containsKey("size") ? parseNonNegativeInt(query.get("size"), "size") : 25;
        if (size < 1 || size > 100) throw new IllegalArgumentException("size debe estar entre 1 y 100.");
        String patientStatus = query.getOrDefault("patientStatus", "TODOS").toUpperCase(Locale.ROOT);
        String assignmentStatus = query.getOrDefault("assignmentStatus", "TODAS").toUpperCase(Locale.ROOT);
        if (!Set.of("TODOS", "ACTIVO", "INACTIVO").contains(patientStatus)) {
            throw new IllegalArgumentException("patientStatus debe ser ACTIVO, INACTIVO o TODOS.");
        }
        if (!Set.of("TODAS", "ACTIVA", "FINALIZADA", "SIN_ASIGNACION").contains(assignmentStatus)) {
            throw new IllegalArgumentException("assignmentStatus debe ser ACTIVA, FINALIZADA, SIN_ASIGNACION o TODAS.");
        }
        PaginaPacientesAsignacion result = assignmentManagement.listarPacientes(patientStatus, assignmentStatus, page, size);
        sendJson(exchange, 200, serializePatientAssignmentPage(result));
    }

    private int parseNonNegativeInt(String value, String name) {
        try {
            int parsed = Integer.parseInt(value);
            if (parsed < 0) throw new IllegalArgumentException(name + " no puede ser negativo.");
            return parsed;
        } catch (NumberFormatException invalid) {
            throw new IllegalArgumentException(name + " debe ser un entero no negativo.");
        }
    }

    private Map<String, String> readQuery(HttpExchange exchange) {
        Map<String, String> result = new HashMap<>();
        String raw = exchange.getRequestURI().getRawQuery();
        if (raw == null || raw.isBlank()) return result;
        for (String pair : raw.split("&")) {
            String[] parts = pair.split("=", 2);
            String key = decode(parts[0]);
            String value = parts.length == 2 ? decode(parts[1]) : "";
            if (key.isBlank() || result.putIfAbsent(key, value) != null) {
                throw new IllegalArgumentException("Parametro de consulta duplicado o vacio.");
            }
        }
        return result;
    }

    private String serializePatientAssignmentPage(PaginaPacientesAsignacion page) {
        StringBuilder json = new StringBuilder("{\"items\":[");
        for (int i = 0; i < page.getItems().size(); i++) {
            if (i > 0) json.append(',');
            PacienteAsignacionResumen row = page.getItems().get(i);
            Paciente patient = row.getPaciente();
            AsignacionProfesionalPaciente last = row.getUltimaAsignacion();
            String state = last == null ? "NONE" : last.isActiva() ? "ACTIVE" : "FINALIZED";
            json.append("{\"patient\":{\"id\":").append(json(patient.getId().toString()))
                .append(",\"fullName\":").append(json(patient.getNombreCompleto()))
                .append(",\"document\":").append(json(patient.getDocumento()))
                .append(",\"active\":").append(patient.isActivo()).append('}')
                .append(",\"assignmentState\":").append(json(state))
                .append(",\"currentAssignment\":").append(last != null && last.isActiva() ? serializeAssignment(last) : "null")
                .append(",\"lastAssignment\":").append(last != null && !last.isActiva() ? serializeAssignment(last) : "null")
                .append('}');
        }
        return json.append("],\"page\":").append(page.getPage())
            .append(",\"size\":").append(page.getSize())
            .append(",\"total\":").append(page.getTotal()).append('}').toString();
    }

    private String serializeAssignment(AsignacionProfesionalPaciente a) {
        return "{\"id\":" + json(a.getId().toString())
            + ",\"patientId\":" + json(a.getPacienteId().toString())
            + ",\"professionalEmail\":" + json(a.getProfesionalEmail())
            + ",\"active\":" + a.isActiva()
            + ",\"startDate\":" + json(a.getFechaInicio().toString())
            + ",\"endDate\":" + jsonOrNull(a.getFechaFin() == null ? null : a.getFechaFin().toString()) + "}";
    }

    private void handleHistoricalPatients(HttpExchange exchange, String method, Session session) throws IOException {
        if (!"GET".equals(method)) { sendError(exchange, 405, "Metodo no permitido."); return; }
        if (!authorization.isAllowed(session.role, "PACIENTES", "HISTORY_READ", permissionRepository)) {
            sendError(exchange, 403, "La configuracion no autoriza la consulta historica."); return;
        }
        if (session.role == Rol.PROFESIONAL && !assignmentManagement.profesionalHabilitado(session.email)) {
            sendError(exchange, 403, "La cuenta profesional no esta habilitada."); return;
        }
        List<Paciente> rows = session.role == Rol.PROFESIONAL
            ? patientManagement.listarHistoricosAsignados(session.email) : patientManagement.listarHistoricos();
        sendJson(exchange, 200, serializePatients(rows));
    }

    private void handleAssignmentRoute(HttpExchange exchange, String method, String[] segments, Session session) throws IOException {
        if (session.role != Rol.ADMINISTRADOR) { sendError(exchange, 403, "La gestion de asignaciones requiere rol administrador."); return; }
        String operation = "GET".equals(method) ? "READ" : "PUT".equals(method) ? "ASSIGN" : "DELETE".equals(method) ? "END" : null;
        if (operation == null) { sendError(exchange, 405, "Metodo no permitido."); return; }
        if (!authorization.isAllowed(session.role, "PACIENTES", "READ", permissionRepository)
                || !authorization.isAllowed(session.role, "ASIGNACIONES", operation, permissionRepository)) {
            sendError(exchange, 403, "La configuracion no autoriza esta operacion de asignacion."); return;
        }
        UUID patientId = UUID.fromString(decode(segments[1]));
        if ("GET".equals(method)) {
            sendJson(exchange, 200, serializeAssignments(assignmentManagement.historial(patientId)));
        } else if ("PUT".equals(method)) {
            String email = required(readForm(exchange), "professionalEmail");
            assignmentManagement.reasignar(patientId, email);
            sendJson(exchange, 200, serializeAssignments(assignmentManagement.historial(patientId)));
        } else {
            if (!assignmentManagement.finalizar(patientId)) sendError(exchange, 404, "No existe una asignacion activa.");
            else sendJson(exchange, 200, serializeAssignments(assignmentManagement.historial(patientId)));
        }
    }
    private LocalDate optionalDate(String value) {
        if (value == null || value.isBlank()) return null;
        try { return LocalDate.parse(value.trim()); }
        catch (DateTimeParseException invalid) { throw new IllegalArgumentException("La fecha debe usar el formato AAAA-MM-DD."); }
    }

    private LocalDate requiredDate(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("La fecha del antecedente es obligatoria.");
        return optionalDate(value);
    }

    private String serializePermissions(List<Permiso> permissions) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < permissions.size(); i++) {
            if (i > 0) json.append(',');
            Permiso p = permissions.get(i);
            json.append("{\"module\":").append(json(p.getModulo()))
                .append(",\"operation\":").append(json(p.getOperacion()))
                .append(",\"allowed\":").append(p.isPermitido()).append('}');
        }
        return json.append(']').toString();
    }

    private String serializeAssignments(List<AsignacionProfesionalPaciente> assignments) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < assignments.size(); i++) {
            if (i > 0) json.append(',');
            AsignacionProfesionalPaciente a = assignments.get(i);
            json.append("{\"id\":").append(json(a.getId().toString()))
                .append(",\"patientId\":").append(json(a.getPacienteId().toString()))
                .append(",\"professionalEmail\":").append(json(a.getProfesionalEmail()))
                .append(",\"active\":").append(a.isActiva())
                .append(",\"startDate\":").append(json(a.getFechaInicio().toString()))
                .append(",\"endDate\":").append(jsonOrNull(a.getFechaFin() == null ? null : a.getFechaFin().toString()))
                .append('}');
        }
        return json.append(']').toString();
    }

    private String serializePatients(List<Paciente> patients) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < patients.size(); i++) {
            if (i > 0) json.append(','); json.append(serializePatient(patients.get(i)));
        }
        return json.append(']').toString();
    }
    private String serializePatient(Paciente p) {
        return "{\"id\":" + json(p.getId().toString()) + ",\"fullName\":" + json(p.getNombreCompleto())
            + ",\"document\":" + json(p.getDocumento()) + ",\"birthDate\":" + jsonOrNull(p.getFechaNacimiento() == null ? null : p.getFechaNacimiento().toString())
            + ",\"phone\":" + jsonOrNull(p.getTelefono()) + ",\"address\":" + jsonOrNull(p.getDireccion())
            + ",\"observations\":" + jsonOrNull(p.getObservaciones()) + ",\"active\":" + p.isActivo() + "}";
    }
    private String serializeAntecedents(List<Antecedente> items) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < items.size(); i++) { if (i > 0) json.append(','); json.append(serializeAntecedent(items.get(i))); }
        return json.append(']').toString();
    }
    private String serializeAntecedent(Antecedente a) {
        return "{\"id\":" + json(a.getId().toString()) + ",\"patientId\":" + json(a.getPacienteId().toString())
            + ",\"type\":" + json(a.getTipo()) + ",\"description\":" + json(a.getDescripcion())
            + ",\"date\":" + json(a.getFecha().toString()) + "}";
    }
    private String jsonOrNull(String value) { return value == null ? "null" : json(value); }
    private String jsonOrEmpty(String value) { return json(value == null ? "" : value); }

    private Session authorizeModule(HttpExchange exchange, String method, Module module) throws IOException {
        Session session = requireSession(exchange);
        if (session == null) {
            return null;
        }
        if (!databaseConfiguration.isConfigured()) {
            sendError(exchange, 503, "La configuración externa de PostgreSQL no está completa.");
            return null;
        }
        if ((module == Module.USERS || module == Module.PROFESSIONALS)
                && session.role != Rol.ADMINISTRADOR) {
            sendError(exchange, 403, "Esta ruta administrativa requiere rol de administrador.");
            return null;
        }
        Operation operation = authorization.operationFor(method);
        boolean allowed = operation != null
            && authorization.isAllowed(session.role, module.name(), operation.name(), permissionRepository);
        if (!allowed) {
            sendError(exchange, 403, "La configur�n de permisos no autoriza esta operaci�n.");
            return null;
        }
        return session;
    }

    private Session requireSession(HttpExchange exchange) throws IOException {
        String authorization = exchange.getRequestHeaders().getFirst("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            sendError(exchange, 401, "Se requiere iniciar sesion.");
            return null;
        }
        String token = authorization.substring("Bearer ".length()).trim();
        JwtTokenService.TokenClaims claims;
        try {
            claims = jwtTokens.verify(token);
        } catch (JwtTokenService.InvalidJwtException invalid) {
            sendError(exchange, 401, "El token es invalido o expiro.");
            return null;
        }
        UUID tokenId = UUID.fromString(claims.tokenId());
        if (!sessionRepository.estaActiva(tokenId, claims.subject(), java.time.Instant.now())) {
            sendError(exchange, 401, "La sesion fue cerrada o revocada.");
            return null;
        }
        Usuario currentUser = users.buscarUsuarioPorCorreo(claims.subject());
        if (currentUser == null || !currentUser.isActivo() || !currentUser.getRol().name().equals(claims.role())) {
            sessionRepository.revocar(tokenId);
            sendError(exchange, 401, "La cuenta ya no esta habilitada para esta sesion.");
            return null;
        }
        boolean mustChangePassword = passwordHasher.esHashTemporal(currentUser.getPasswordHash());
        if (mustChangePassword) {
            String path = exchange.getRequestURI().getRawPath();
            boolean allowedPath = "/api/auth/me".equals(path)
                || "/api/auth/change-password".equals(path)
                || "/api/auth/logout".equals(path);
            if (!allowedPath) {
                sendError(exchange, 403, "Debes cambiar tu contrasena antes de continuar.");
                return null;
            }
        }
        return new Session(tokenId, currentUser.getCorreo(), currentUser.getNombre(), currentUser.getRol(), mustChangePassword);
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
        sessionRepository.revocarTodas(email);
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
        return "{\"id\":" + json(item.getId().toString())
            + ",\"name\":" + json(item.getNombre())
            + ",\"document\":" + json(item.getDocumento())
            + ",\"email\":" + json(item.getCorreo())
            + ",\"phone\":" + jsonOrEmpty(item.getTelefono())
            + ",\"active\":" + item.isActivo()
            + ",\"specialty\":" + jsonOrEmpty(item.getEspecialidad())
            + ",\"licenseNumber\":" + jsonOrEmpty(item.getRegistroProfesional())
            + ",\"education\":" + jsonOrEmpty(item.getFormacion())
            + ",\"experience\":" + jsonOrEmpty(item.getExperiencia())
            + ",\"biography\":" + jsonOrEmpty(item.getBiografia())
            + ",\"verificationStatus\":" + json(item.getEstadoVerificacion())
            + ",\"reviewNote\":" + jsonOrEmpty(item.getNotaRevision())
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
        return "{\"id\":" + json(item.getId().toString())
            + ",\"name\":" + json(item.getNombre())
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
        String normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail.matches("^[^\\s;@]+@[^\\s;@]+\\.[^\\s;@]+$")) {
            throw new IllegalArgumentException("El correo electrónico no es válido.");
        }
        return normalizedEmail;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
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
        private final UUID tokenId;
        private final String email;
        private final String name;
        private final Rol role;
        private final boolean mustChangePassword;

        private Session(UUID tokenId, String email, String name, Rol role, boolean mustChangePassword) {
            this.tokenId = tokenId;
            this.email = email;
            this.name = name;
            this.role = role;
            this.mustChangePassword = mustChangePassword;
        }
    }
}
