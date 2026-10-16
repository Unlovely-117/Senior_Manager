-- Adds stable account/profile identifiers while retaining the legacy email snapshot
-- on assignment history. Unresolvable historical links remain NULL and fail closed.
CREATE TABLE usuarios (
    id UUID PRIMARY KEY,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
    correo TEXT NOT NULL CHECK (length(trim(correo)) > 0),
    correo_normalizado TEXT GENERATED ALWAYS AS (lower(trim(correo))) STORED UNIQUE,
    password_hash TEXT NOT NULL CHECK (length(trim(password_hash)) > 0),
    rol VARCHAR(32) NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'PROFESIONAL')),
    activo BOOLEAN NOT NULL
);

CREATE TABLE profesionales (
    id UUID PRIMARY KEY,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
    documento TEXT NOT NULL CHECK (length(trim(documento)) > 0),
    documento_normalizado TEXT GENERATED ALWAYS AS (upper(trim(documento))) STORED UNIQUE,
    correo TEXT NOT NULL CHECK (length(trim(correo)) > 0),
    correo_normalizado TEXT GENERATED ALWAYS AS (lower(trim(correo))) STORED,
    telefono TEXT NULL,
    activo BOOLEAN NOT NULL,
    usuario_id UUID NULL UNIQUE REFERENCES usuarios(id) ON DELETE RESTRICT
);
CREATE INDEX profesionales_correo_normalizado_idx ON profesionales (correo_normalizado);

ALTER TABLE asignaciones_profesional_paciente
    ADD COLUMN profesional_id UUID NULL REFERENCES profesionales(id) ON DELETE RESTRICT;

-- Backfill only exact, unique email matches. The legacy email remains unchanged
-- as an audit snapshot, and ambiguous/unmatched rows keep profesional_id NULL.
UPDATE profesionales p
SET usuario_id = u.id
FROM usuarios u
WHERE u.correo_normalizado = p.correo_normalizado
  AND u.rol = 'PROFESIONAL'
  AND (SELECT count(*) FROM profesionales p2 WHERE p2.correo_normalizado = p.correo_normalizado) = 1;

UPDATE asignaciones_profesional_paciente a
SET profesional_id = p.id
FROM profesionales p
WHERE lower(trim(a.profesional_email)) = p.correo_normalizado
  AND (SELECT count(*) FROM profesionales p2 WHERE p2.correo_normalizado = p.correo_normalizado) = 1;

CREATE INDEX asignaciones_profesional_id_activa_idx
    ON asignaciones_profesional_paciente (profesional_id, paciente_id)
    WHERE estado = 'ACTIVA' AND fecha_fin IS NULL;

CREATE TABLE legacy_text_import (
    import_key TEXT PRIMARY KEY CHECK (import_key = 'identity_txt_v1'),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_count INTEGER NOT NULL CHECK (user_count >= 0),
    professional_count INTEGER NOT NULL CHECK (professional_count >= 0)
);
