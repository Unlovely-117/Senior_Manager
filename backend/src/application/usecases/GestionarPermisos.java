package application.usecases;

import domain.RepositorioPermisos;
import domain.entities.Permiso;
import domain.entities.Rol;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Use case for administrator-only complete permission configuration updates. */
public final class GestionarPermisos {
    private static final Set<String> CONFIGURABLE_PROFESSIONAL_PERMISSIONS = Set.of(
        "PACIENTES/READ", "PACIENTES/HISTORY_READ", "ANTECEDENTES/READ",
        "CITAS/READ", "CITAS/CREATE", "CITAS/UPDATE", "CITAS/DELETE",
        "EJERCICIOS/READ", "EJERCICIOS/CREATE"
    );
    private final RepositorioPermisos repositorio;
    private final AuthorizationService authorization = new AuthorizationService();
    public GestionarPermisos(RepositorioPermisos repositorio) { this.repositorio = repositorio; }
    public List<Permiso> listar(Rol actor, Rol target) {
        requireAdministrator(actor);
        requireEffectivePermission(actor, "READ");
        return repositorio.listarPorRol(target);
    }
    public void reemplazar(Rol actor, Rol target, List<Permiso> permissions) {
        requireAdministrator(actor);
        requireEffectivePermission(actor, "UPDATE");
        if (target == null || permissions == null) throw new IllegalArgumentException("La configuración es obligatoria.");
        Set<String> keys = new HashSet<>();
        for (Permiso p : permissions) {
            String key = p.getModulo() + "\u0000" + p.getOperacion();
            if (!keys.add(key)) throw new IllegalArgumentException("Hay permisos duplicados para módulo y operación.");
        }
        repositorio.reemplazarConfiguracion(target, List.copyOf(permissions));
    }
    public void guardar(Rol actor, Rol target, Permiso permission) {
        requireAdministrator(actor);
        requireEffectivePermission(actor, "UPDATE");
        if (target == null || permission == null) throw new IllegalArgumentException("El permiso es obligatorio.");
        repositorio.guardarPermiso(target, permission);
    }
    /** Admins may tune only the predefined day-to-day permissions of professional accounts. */
    public void guardarPermisoProfesional(Rol actor, Rol target, Permiso permission) {
        requireAdministrator(actor);
        requireEffectivePermission(actor, "READ");
        if (target != Rol.PROFESIONAL || permission == null) {
            throw new SecurityException("Solo se pueden configurar permisos del rol Profesional.");
        }
        String key = permission.getModulo() + "/" + permission.getOperacion();
        if (!CONFIGURABLE_PROFESSIONAL_PERMISSIONS.contains(key)) {
            throw new SecurityException("El permiso solicitado no está disponible para configuración desde la interfaz.");
        }
        repositorio.guardarPermiso(target, permission);
    }
    private static void requireAdministrator(Rol actor) {
        if (actor != Rol.ADMINISTRADOR) throw new SecurityException("Solo un administrador puede configurar permisos.");
    }
    private void requireEffectivePermission(Rol actor, String operation) {
        if (!authorization.isAllowed(actor, "PERMISOS", operation, repositorio)) {
            throw new SecurityException("La configuración no autoriza esta operación de permisos.");
        }
    }
}
