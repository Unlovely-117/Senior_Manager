package application.usecases;

import domain.entities.Rol;
import java.util.Locale;
import domain.RepositorioPermisos;
import domain.entities.Permiso;

/** Central policy for the modules and operations currently exposed by the API. */
public final class AuthorizationService {

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

    public boolean canAccessModule(Rol role, Module module) {
        // This legacy overload has no permission repository, so it cannot issue an effective grant.
        return false;
    }

    public boolean isAllowed(Rol role, Module module, Operation operation) {
        // A role is not itself a permission; callers must use the repository-backed overload.
        return false;
    }

    /** Configurable check. A missing decision or unavailable permission source must deny access. */
    public boolean isAllowed(Rol role, String module, String operation, RepositorioPermisos permissions) {
        if (role == null || module == null || module.isBlank() || operation == null
                || operation.isBlank() || permissions == null) return false;
        Boolean decision = null;
        for (Permiso permission : permissions.listarPorRol(role)) {
            if (permission.getModulo().equalsIgnoreCase(module.trim())
                    && permission.getOperacion().equalsIgnoreCase(operation.trim())) {
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
