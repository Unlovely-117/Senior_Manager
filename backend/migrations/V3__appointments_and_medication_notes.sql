-- Appointment scheduling and medication follow-up notes. Medication fields do not encode doses or prescriptions.
CREATE TABLE citas (
    id UUID PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT,
    fecha_hora TIMESTAMPTZ NOT NULL,
    motivo TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA', 'COMPLETADA', 'CANCELADA')),
    creado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX citas_paciente_fecha_idx ON citas (paciente_id, fecha_hora DESC);
CREATE INDEX citas_profesional_fecha_idx ON citas (profesional_id, fecha_hora);

CREATE TABLE seguimientos_medicamentos (
    id UUID PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    medicamento TEXT NOT NULL CHECK (length(trim(medicamento)) > 0),
    notas TEXT NOT NULL CHECK (length(trim(notas)) > 0),
    registrado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX seguimientos_medicamentos_paciente_fecha_idx ON seguimientos_medicamentos (paciente_id, registrado_en DESC);
