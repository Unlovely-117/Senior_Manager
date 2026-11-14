-- V7: Consolidación QA (O-1/O-2/O-3): unicidad de asignación activa, vínculo cuenta-ficha,
-- índices de soporte para claves foráneas, planes de ejercicios y datos del catálogo.

CREATE UNIQUE INDEX asignacion_activa_unica
    ON asignaciones_profesional_paciente (paciente_id)
    WHERE estado = 'ACTIVA' AND fecha_fin IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profesional_cuenta_unica
    ON profesionales (usuario_id)
    WHERE usuario_id IS NOT NULL;

-- Índices de soporte para claves foráneas frecuentes.
CREATE INDEX IF NOT EXISTS citas_creado_por_idx ON citas (creado_por);
CREATE INDEX IF NOT EXISTS seguimientos_medicamentos_registrado_por_idx ON seguimientos_medicamentos (registrado_por);
CREATE INDEX IF NOT EXISTS seguimientos_ejercicios_registrado_por_idx ON seguimientos_ejercicios (registrado_por);
CREATE INDEX IF NOT EXISTS seguimientos_ejercicios_ejercicio_catalogo_idx ON seguimientos_ejercicios (ejercicio_catalogo_id);
CREATE INDEX IF NOT EXISTS planes_ejercicios_ejercicio_idx ON planes_ejercicios (ejercicio_id);
CREATE INDEX IF NOT EXISTS planes_ejercicios_asignado_por_idx ON planes_ejercicios (asignado_por);
CREATE INDEX IF NOT EXISTS profesionales_verificado_por_idx ON profesionales (verificado_por);
CREATE INDEX IF NOT EXISTS sesiones_expira_en_idx ON sesiones (expira_en);

-- Un plan activo por ejercicio y paciente; validación de indicaciones.
CREATE UNIQUE INDEX plan_ejercicio_activo_unico
    ON planes_ejercicios (paciente_id, ejercicio_id)
    WHERE activo;

ALTER TABLE planes_ejercicios ADD CONSTRAINT chk_indicaciones_len CHECK (length(indicaciones) <= 2000);

-- Los datos usaban el término "riesgo de caídas alto"; se unifica con el término del catálogo.
UPDATE catalogo_ejercicios
   SET restricciones_clinicas = array_replace(restricciones_clinicas, 'riesgo de caídas alto', 'riesgo de caídas')
 WHERE 'riesgo de caídas alto' = ANY (restricciones_clinicas);
