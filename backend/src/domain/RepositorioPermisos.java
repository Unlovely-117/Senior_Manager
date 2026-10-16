package domain;

import domain.entities.Permiso;
import domain.entities.Rol;
import java.util.List;

/** Persistence port for a complete permission configuration per existing role. */
public interface RepositorioPermisos {

    List<Permiso> listarPorRol(Rol rol);

    /** Replaces the role's complete configuration atomically in the concrete adapter. */
    void reemplazarConfiguracion(Rol rol, List<Permiso> permisos);

    /** Atomically adds or replaces one module/operation decision. */
    void guardarPermiso(Rol rol, Permiso permiso);
}
