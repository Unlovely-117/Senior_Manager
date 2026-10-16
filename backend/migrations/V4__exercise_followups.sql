-- Exercise follow-up records for patients, separate from medication tracking.
CREATE TABLE seguimientos_ejercicios (
    id UUID PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    ejercicio TEXT NOT NULL CHECK (length(trim(ejercicio)) > 0),
    notas TEXT NOT NULL CHECK (length(trim(notas)) > 0),
    registrado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX seguimientos_ejercicios_paciente_fecha_idx
    ON seguimientos_ejercicios (paciente_id, registrado_en DESC);
