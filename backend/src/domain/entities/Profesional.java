package domain.entities;

public class Profesional {

    private String nombre;
    private String documento;
    private String correo;
    private String telefono;

    public Profesional(String nombre, String documento, String correo, String telefono) {
        this.nombre = nombre;
        this.documento = documento;
        this.correo = correo;
        this.telefono = telefono;
    }

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
    
}


