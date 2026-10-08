
package domain.entities;

// Representa una cuenta de acceso a Senior-Manage.
public class Usuario {

    private String nombre;
    private String correo;
    private String passwordHash;
    private Rol rol;
    private boolean activo;

    //constuctor
    public Usuario(String nombre, String correo, String passwordHash, Rol rol) {
        //validacion de constuctor
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio.");
        }

        if (correo == null || correo.isBlank()) {
            throw new IllegalArgumentException("El correo es obligatorio.");
        }

        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("La contraseña es obligatoria.");
        }

        if (rol == null) {
            throw new IllegalArgumentException("El rol es obligatorio.");
        }

        //asignacion de valores a los atributos
        this.nombre = nombre;
        this.correo = correo;
        this.passwordHash = passwordHash;
        this.rol = rol;
        this.activo = true;
    }

    //getter permite consultar el valor de un atributo y setteer modifica el valor del atributo
    public String getNombre() {
        return nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Rol getRol() {
        return rol;
    }

    public boolean isActivo() {
        return activo;
    }

    //Métodos para modificar datos
    public void cambiarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio.");
        }
        this.nombre = nombre;
    }

    public void cambiarCorreo(String correo) {
        if (correo == null || correo.isBlank()) {
            throw new IllegalArgumentException("El correo es obligatorio.");
        }
        this.correo = correo;
    }

    public void cambiarPasswordHash(String passwordHash) {
        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("La contraseña es obligatoria.");
        }
        this.passwordHash = passwordHash;
    }

    public void cambiarRol(Rol rol) {
        if (rol == null) {
            throw new IllegalArgumentException("El rol es obligatorio.");
        }
        this.rol = rol;
    }

    //activa o desactiva la cuenta de usuario
    public void activar() {
        this.activo = true;
    }
 
    public void desactivar() {
        this.activo = false;
    }
}