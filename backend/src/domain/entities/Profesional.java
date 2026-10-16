package domain.entities;
import java.util.UUID;
//Indica que esta clase pertenece al paquete de entidades.

public class Profesional { 

    private final UUID id;
    private String nombre; //guarda los datos n,d,c,t
    private String documento;
    private String correo;
    private String telefono;
    private boolean activo; // Indica si el profesional está activo o desactivado.
    private String especialidad;
    private String registroProfesional;
    private String formacion;
    private String experiencia;
    private String biografia;
    private String estadoVerificacion = "SIN_PRESENTAR";
    private String notaRevision;

    public Profesional(String nombre, String documento, String correo, String telefono) { //contructor q recibelos datos de P
        this(UUID.randomUUID(), nombre, documento, correo, telefono);
    }

    public Profesional(UUID id, String nombre, String documento, String correo, String telefono) {
        if (id == null) {
            throw new IllegalArgumentException("El identificador del profesional es obligatorio.");
        }
        this.id = id;
        this.nombre = nombre;
        this.documento = documento;
        this.correo = correo;
        this.telefono = telefono;
        this.activo = true; // Todo profesional nuevo comienza activo.
    }
//“representa al profesional y contiene sus datos. Los métodos get permiten consultar los atributos y los métodos set permiten modificarlos.”
    public String getNombre() {
    return nombre;
    }

    public UUID getId() {
    return id;
    }

    public String getDocumento() {
    return documento;
    }

    public String getCorreo() {
    return correo;
    }

    public String getTelefono() {
    return telefono;
    }

    public String getEspecialidad() { return especialidad; }
    public String getRegistroProfesional() { return registroProfesional; }
    public String getFormacion() { return formacion; }
    public String getExperiencia() { return experiencia; }
    public String getBiografia() { return biografia; }
    public String getEstadoVerificacion() { return estadoVerificacion; }
    public String getNotaRevision() { return notaRevision; }

    public void setFichaProfesional(String especialidad, String registroProfesional, String formacion,
            String experiencia, String biografia, String estadoVerificacion, String notaRevision) {
        this.especialidad = especialidad;
        this.registroProfesional = registroProfesional;
        this.formacion = formacion;
        this.experiencia = experiencia;
        this.biografia = biografia;
        this.estadoVerificacion = estadoVerificacion == null ? "SIN_PRESENTAR" : estadoVerificacion;
        this.notaRevision = notaRevision;
    }

    public void setNombre(String nombre) {
    this.nombre = nombre;
    }

    public void setCorreo(String correo) {
    this.correo = correo;
    }

    public void setTelefono(String telefono) {
    this.telefono = telefono;
    }
    
    public boolean isActivo() { // Permite consultar si está activo.
        return activo;
    } 

    public void setActivo(boolean activo) {// Permite cambiar su estado.
        this.activo = activo;
    } 
}


