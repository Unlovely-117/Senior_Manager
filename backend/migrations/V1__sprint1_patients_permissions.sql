-- V1 baseline schema for new Senior Manager environments. Apply only through the explicit Flyway operator command.
CREATE TABLE pacientes (
    id UUID PRIMARY KEY,
    nombre_completo TEXT NOT NULL CHECK (length(trim(nombre_completo)) > 0),
    documento TEXT NOT NULL CHECK (length(trim(documento)) > 0),
    documento_normalizado TEXT GENERATED ALWAYS AS (upper(trim(documento))) STORED
        CONSTRAINT pacientes_documento_normalizado_unique UNIQUE,
    fecha_nacimiento DATE NULL,
    telefono TEXT NULL,
    direccion TEXT NULL,
    observaciones TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE antecedentes (
    id UUID PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    tipo TEXT NOT NULL CHECK (length(trim(tipo)) > 0),
    descripcion TEXT NOT NULL CHECK (length(trim(descripcion)) > 0),
    fecha DATE NOT NULL
);
CREATE INDEX antecedentes_paciente_fecha_idx ON antecedentes (paciente_id, fecha, id);

CREATE TABLE permisos_rol (
    rol VARCHAR(32) NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'PROFESIONAL')),
    modulo TEXT NOT NULL CHECK (length(trim(modulo)) > 0),
    operacion TEXT NOT NULL CHECK (length(trim(operacion)) > 0),
    permitido BOOLEAN NOT NULL,
    PRIMARY KEY (rol, modulo, operacion)
);

CREATE TABLE sesiones (
    jti UUID PRIMARY KEY,
    correo TEXT NOT NULL,
    expira_en TIMESTAMPTZ NOT NULL,
    revocada_en TIMESTAMPTZ NULL
);
CREATE INDEX sesiones_correo_activa_idx ON sesiones (correo, expira_en) WHERE revocada_en IS NULL;

CREATE TABLE permission_bootstrap_state (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    completed_at TIMESTAMPTZ NOT NULL,
    actor_email TEXT NOT NULL,
    configuration_sha256 CHAR(64) NOT NULL
);

CREATE TABLE asignaciones_profesional_paciente (
    id UUID PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    profesional_email TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('ACTIVA', 'FINALIZADA')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,
    CHECK ((estado = 'ACTIVA' AND fecha_fin IS NULL) OR (estado = 'FINALIZADA' AND fecha_fin IS NOT NULL)),
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE UNIQUE INDEX asignaciones_unica_activa_por_paciente_idx
    ON asignaciones_profesional_paciente (paciente_id) WHERE estado = 'ACTIVA' AND fecha_fin IS NULL;
CREATE INDEX asignaciones_profesional_activa_idx
    ON asignaciones_profesional_paciente (profesional_email, paciente_id) WHERE estado = 'ACTIVA' AND fecha_fin IS NULL;
