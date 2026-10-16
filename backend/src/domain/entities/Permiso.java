package domain.entities;

import java.util.Locale;

/** One role's decision for a module/operation pair. The project has no approved matrix yet. */
public final class Permiso {

    private final String modulo;
    private final String operacion;
    private final boolean permitido;

    public Permiso(String modulo, String operacion, boolean permitido) {
        if (modulo == null || modulo.isBlank()) {
            throw new IllegalArgumentException("El módulo es obligatorio.");
        }
        if (operacion == null || operacion.isBlank()) {
            throw new IllegalArgumentException("La operación es obligatoria.");
        }
        this.modulo = modulo.trim().toUpperCase(Locale.ROOT);
        this.operacion = operacion.trim().toUpperCase(Locale.ROOT);
        this.permitido = permitido;
    }

    public String getModulo() {
        return modulo;
    }

    public String getOperacion() {
        return operacion;
    }

    public boolean isPermitido() {
        return permitido;
    }
}
