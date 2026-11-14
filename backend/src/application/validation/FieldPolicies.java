package application.validation;

import java.time.LocalDate;
import java.util.Map;
import java.util.regex.Pattern;

/** Static entry validation policies with normalized values and clear Spanish error messages. */
public final class FieldPolicies {

    public static final int MIN_PASSWORD_LENGTH = 12;
    public static final int MAX_TEXTO_CORTO = 120;
    public static final int MAX_TEXTO_LARGO = 2000;
    public static final int MAX_DIRECCION = 300;

    private static final Pattern DOCUMENTO = Pattern.compile("^\\d{5,15}$", Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern TELEFONO = Pattern.compile("^\\+?\\d{7,15}$", Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern NOMBRE = Pattern.compile("^[\\p{L}\\s.'-]{1,150}$", Pattern.UNICODE_CHARACTER_CLASS);

    private FieldPolicies() { }

    /** Quita puntos, guiones y espacios del documento. */
    public static String normalizeDocument(String value) {
        if (value == null) return null;
        return value.replaceAll("[.\\s-]", "");
    }

    /** Devuelve el documento normalizado o falla con un mensaje claro en español. */
    public static String validateDocument(String value) {
        String normalized = normalizeDocument(value);
        if (normalized == null || !DOCUMENTO.matcher(normalized).matches()) {
            throw new IllegalStateException("La cédula debe contener solo números (5 a 15 dígitos).");
        }
        return normalized;
    }

    /** Igual que validateDocument(String), pero sobre el campo "document" del formulario (lo deja normalizado). */
    public static String validateDocument(Map<String, String> form) {
        String normalized = validateDocument(form.get("document"));
        form.put("document", normalized);
        return normalized;
    }

    /** Valida el nombre completo (letras, espacios, puntos, apóstrofes y guiones; 1 a 150 caracteres). */
    public static String validateName(String value) {
        if (value == null || value.isBlank()) throw new IllegalStateException("El nombre es obligatorio.");
        String trimmed = value.trim();
        if (trimmed.indexOf('\0') >= 0 || !NOMBRE.matcher(trimmed).matches()) {
            throw new IllegalStateException("El nombre contiene caracteres no válidos.");
        }
        return trimmed;
    }

    /** Valida el teléfono opcional; null o vacío devuelven null. Quita espacios y guiones antes de validar. */
    public static String validatePhone(String value) {
        if (value == null) return null;
        String normalized = value.replaceAll("[\\s-]", "").trim();
        if (normalized.isEmpty()) return null;
        if (!TELEFONO.matcher(normalized).matches()) {
            throw new IllegalStateException("El teléfono no es válido (formato + opcional y 7 a 15 dígitos).");
        }
        return normalized;
    }

    /** Valida longitud máxima y presencia según "required"; rechaza caracteres de control. Opcional vacío → null. */
    public static String validateBoundedText(String value, String field, int max, boolean required) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.indexOf('\0') >= 0) throw new IllegalStateException("El campo " + field + " contiene caracteres no válidos.");
        if (required && trimmed.isEmpty()) throw new IllegalStateException("El campo " + field + " es obligatorio.");
        if (trimmed.length() > max) throw new IllegalStateException("El campo " + field + " no puede superar " + max + " caracteres.");
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Valida la fecha de nacimiento: no futura y con edad de hasta 120 años. */
    public static LocalDate validateBirthDate(LocalDate birthDate) {
        if (birthDate == null) throw new IllegalStateException("La fecha de nacimiento es obligatoria.");
        LocalDate today = LocalDate.now();
        if (birthDate.isAfter(today)) throw new IllegalStateException("La fecha de nacimiento no puede ser futura.");
        if (birthDate.isBefore(today.minusYears(120))) throw new IllegalStateException("La fecha de nacimiento no puede superar 120 años.");
        return birthDate;
    }
}
