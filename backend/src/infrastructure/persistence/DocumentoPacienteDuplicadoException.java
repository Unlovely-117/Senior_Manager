package infrastructure.persistence;

public final class DocumentoPacienteDuplicadoException extends RuntimeException {
    public DocumentoPacienteDuplicadoException() { super("Ya existe un paciente con ese documento."); }
}
