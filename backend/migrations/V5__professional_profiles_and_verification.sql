ALTER TABLE profesionales
    ADD COLUMN especialidad TEXT NULL,
    ADD COLUMN registro_profesional TEXT NULL,
    ADD COLUMN formacion TEXT NULL,
    ADD COLUMN experiencia TEXT NULL,
    ADD COLUMN biografia TEXT NULL,
    ADD COLUMN estado_verificacion VARCHAR(32) NOT NULL DEFAULT 'SIN_PRESENTAR'
        CHECK (estado_verificacion IN ('SIN_PRESENTAR', 'PENDIENTE', 'VERIFICADA', 'REQUIERE_CAMBIOS')),
    ADD COLUMN nota_revision TEXT NULL,
    ADD COLUMN verificado_por UUID NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN verificado_en TIMESTAMPTZ NULL;

CREATE INDEX profesionales_estado_verificacion_idx ON profesionales (estado_verificacion);
