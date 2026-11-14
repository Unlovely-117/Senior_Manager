import application.validation.FieldPolicies;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Batería O-2.3 del plan QA: validación de entrada campo a campo.
 * Cubre el caso cédula (letras rechazadas), pegado con formato, límites, teléfono,
 * nombres imposibles y fechas de nacimiento irreales.
 */
public final class TestFieldPolicies {

    // ---------- Documento / cédula ----------

    @ParameterizedTest
    @ValueSource(strings = {"abc123", "1023456a", "12.3", "########", "cédula"})
    void letrasYSimbolosEnCedulaSonRechazados(String entrada) {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateDocument(entrada), "\"" + entrada + "\" debe rechazarse");
    }

    @ParameterizedTest
    @ValueSource(strings = {"1023456789", "1.023.456-78", "1 023 456 78"})
    void cedulaConFormatoSeNormaliza(String entrada) {
        String esperado = entrada.replaceAll("[.\\s-]", "");
        assertEquals(esperado, FieldPolicies.validateDocument(entrada));
    }

    @Test
    void documentoPorDebajoDelMinimoRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateDocument("1.2.3"));
    }

    @Test
    void documentoSoloEspaciosRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateDocument("   "));
    }

    @Test
    void documentoExcesivamenteLargoRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateDocument("9".repeat(100)));
    }

    @Test
    void validateDocumentEnMapNormalizaElCampo() {
        Map<String, String> form = new HashMap<>();
        form.put("document", "1.023.456-78");
        assertEquals("102345678", FieldPolicies.validateDocument(form));
        assertEquals("102345678", form.get("document"), "el campo queda normalizado en el formulario");
    }

    // ---------- Nombre ----------

    @Test
    void nombreConNumerosRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateName("12345"));
    }

    @Test
    void nombreValidoConAcentosAceptado() {
        String nombre = "María Ñéquez O'Connell";
        assertEquals(nombre, FieldPolicies.validateName(nombre));
    }

    @Test
    void nombreSoloEspaciosRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateName("   "));
    }

    @Test
    void nombreConCaracterNuloRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateName("Ana\u0000Mal"));
    }

    // ---------- Teléfono ----------

    @Test
    void telefonoConLetrasRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validatePhone("tres dos uno"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"3001234567", "+57 300 123 4567", "300-123-456"})
    void telefonoValidoEnFormatosComunes(String entrada) {
        assertDoesNotThrow(() -> FieldPolicies.validatePhone(entrada), entrada + " debe aceptarse");
    }

    @Test
    void telefonoMenosDeSieteDigitosRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validatePhone("300123"));
    }

    @Test
    void telefonoOpcionalVacioSeAceptaComoNull() {
        assertNull(FieldPolicies.validatePhone(null));
        assertNull(FieldPolicies.validatePhone(""));
        assertNull(FieldPolicies.validatePhone("   "));
    }

    // ---------- Fecha de nacimiento ----------

    @Test
    void nacimientoFuturaRechazada() {
        LocalDate futura = LocalDate.now().plusYears(2);
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateBirthDate(futura));
    }

    @Test
    void nacimientoDeMasDe120AniosRechazada() {
        LocalDate muyAntigua = LocalDate.now().minusYears(121);
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateBirthDate(muyAntigua));
    }

    @Test
    void nacimientoRazonableAceptada() {
        LocalDate razonable = LocalDate.now().minusYears(75);
        assertDoesNotThrow(() -> FieldPolicies.validateBirthDate(razonable));
    }

    // ---------- Textos acotados ----------

    @Test
    void textoObligatorioVacioRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateBoundedText("   ", "observaciones", 2000, true));
    }

    @Test
    void textoPorEncimaDelLimiteRechazado() {
        assertThrows(IllegalStateException.class, () -> FieldPolicies.validateBoundedText("a".repeat(2001), "observaciones", 2000, true));
    }

    @Test
    void textoOpcionalVacioDevuelveNull() {
        assertNull(FieldPolicies.validateBoundedText(null, "experiencia", 2000, false));
    }
}
