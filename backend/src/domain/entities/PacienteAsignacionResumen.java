package domain.entities;

/** Minimal patient directory data plus its most relevant assignment for administrative listing. */
public final class PacienteAsignacionResumen {
    private final Paciente paciente;
    private final AsignacionProfesionalPaciente ultimaAsignacion;

    public PacienteAsignacionResumen(Paciente paciente, AsignacionProfesionalPaciente ultimaAsignacion) {
        this.paciente = paciente;
        this.ultimaAsignacion = ultimaAsignacion;
    }

    public Paciente getPaciente() { return paciente; }
    public AsignacionProfesionalPaciente getUltimaAsignacion() { return ultimaAsignacion; }
}
