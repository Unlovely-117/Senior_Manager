package application.usecases;

import domain.RepositorioPermisos;
import domain.entities.Permiso;
import domain.entities.Rol;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/** Central policy for the modules and operations currently exposed by the API. */
public final class AuthorizationService {

    private static final List<Permiso> ADMIN_PERMISSIONS = List.of(
        new Permiso("USERS", "READ", true),
        new Permiso("USERS", "CREATE", true),
        new Permiso("USERS", "UPDATE", true),
        new Permiso("USERS", "DELETE", true),
        new Permiso("PROFESSIONALS", "READ", true),
        new Permiso("PROFESSIONALS", "CREATE", true),
        new Permiso("PROFESSIONALS", "UPDATE", true),
        new Permiso("PROFESSIONALS", "DELETE", true),
        new Permiso("ASIGNACIONES", "READ", true),
        new Permiso("ASIGNACIONES", "ASSIGN", true),
        new Permiso("ASIGNACIONES", "END", true),
        new Permiso("PERMISOS", "READ", true),
        new Permiso("PERMISOS", "UPDATE", true),
        new Permiso("PACIENTES", "READ", true),
        new Permiso("PACIENTES", "CREATE", true),
        new Permiso("PACIENTES", "UPDATE", true),
        new Permiso("PACIENTES", "DEACTIVATE", true),
        new Permiso("PACIENTES", "HISTORY_READ", true),
        new Permiso("ANTECEDENTES", "READ", true),
        new Permiso("ANTECEDENTES", "CREATE", true),
        new Permiso("ANTECEDENTES", "UPDATE", true),
        new Permiso("CITAS", "READ", true),
        new Permiso("CITAS", "CREATE", true),
        new Permiso("CITAS", "UPDATE", true),
        new Permiso("EJERCICIOS", "READ", true),
        new Permiso("EJERCICIOS", "CREATE", true)
    );
    private static final Set<String> SYSTEM_PERMISSION_KEYS = ADMIN_PERMISSIONS.stream()
        .map(permission -> permission.getModulo() + "/" + permission.getOperacion())
        .collect(Collectors.toUnmodifiableSet());

    public enum Module {
        USERS,
        PROFESSIONALS
    }

    public enum Operation {
        READ,
        CREATE,
        UPDATE,
        DELETE
    }

    public static List<Permiso> adminPermissions() {
        return ADMIN_PERMISSIONS;
    }

    public boolean canAccessModule(Rol role, Module module) {
        // This legacy overload has no permission repository, so it cannot issue an effective grant.
        return false;
    }

    public boolean isAllowed(Rol role, Module module, Operation operation) {
        // A role is not itself a permission; callers must use the repository-backed overload.
        return false;
    }

    /** Configurable check. Administrators hold full access across valid system permissions; a missing decision denies access. */
    public boolean isAllowed(Rol role, String module, String operation, RepositorioPermisos permissions) {
        if (role == null || module == null || module.isBlank() || operation == null
                || operation.isBlank() || permissions == null) return false;
        String normalizedModule = module.trim().toUpperCase(Locale.ROOT);
        String normalizedOperation = operation.trim().toUpperCase(Locale.ROOT);
        if (role == Rol.ADMINISTRADOR && SYSTEM_PERMISSION_KEYS.contains(normalizedModule + "/" + normalizedOperation)) {
            return true;
        }
        Boolean decision = null;
        for (Permiso permission : permissions.listarPorRol(role)) {
            if (permission.getModulo().equalsIgnoreCase(normalizedModule)
                    && permission.getOperacion().equalsIgnoreCase(normalizedOperation)) {
                if (decision != null) return false;
                decision = permission.isPermitido();
            }
        }
        return Boolean.TRUE.equals(decision);
    }

    public Operation operationFor(String method) {
        if (method == null) {
            return null;
        }
        return switch (method.toUpperCase(Locale.ROOT)) {
            case "GET" -> Operation.READ;
            case "POST" -> Operation.CREATE;
            case "PUT", "PATCH" -> Operation.UPDATE;
            case "DELETE" -> Operation.DELETE;
            default -> null;
        };
    }
}
