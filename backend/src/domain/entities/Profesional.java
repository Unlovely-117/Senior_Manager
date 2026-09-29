package domain.entities;
//Indica que esta clase pertenece al paquete de entidades.

public class Profesional { 

    private String nombre; //guarda los datos n,d,c,t
    private String documento;
    private String correo;
    private String telefono;
    private boolean activo; // Indica si el profesional está activo o desactivado.

    public Profesional(String nombre, String documento, String correo, String telefono) { //contructor q recibelos datos de P
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

    public String getDocumento() {
    return documento;
    }

    public String getCorreo() {
    return correo;
    }

    public String getTelefono() {
    return telefono;
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


