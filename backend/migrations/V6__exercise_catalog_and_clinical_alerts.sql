-- General movement library. The restrictions are screening alerts, not a clinical protocol.
CREATE TABLE catalogo_ejercicios (
    id TEXT PRIMARY KEY CHECK (length(trim(id)) > 0),
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
    categoria TEXT NOT NULL CHECK (length(trim(categoria)) > 0),
    descripcion TEXT NOT NULL CHECK (length(trim(descripcion)) > 0),
    restricciones_clinicas TEXT[] NOT NULL DEFAULT '{}',
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE seguimientos_ejercicios
    ADD COLUMN ejercicio_catalogo_id TEXT NULL REFERENCES catalogo_ejercicios(id) ON DELETE RESTRICT;

INSERT INTO catalogo_ejercicios (id, nombre, categoria, descripcion, restricciones_clinicas) VALUES
('respiracion-diafragmatica','Respiración diafragmática','Respiración','Sentado, inhalar suavemente por la nariz y exhalar sin esfuerzo.','{}'),
('movilidad-tobillos','Movilidad de tobillos','Movilidad','Sentado, flexionar y extender los tobillos dentro de un rango cómodo.','{}'),
('circulos-hombros','Círculos de hombros','Movilidad','Realizar círculos pequeños y lentos con los hombros, sin dolor.','{}'),
('extension-rodilla-sentado','Extensión de rodilla sentado','Fuerza','Extender una rodilla sentado y regresar lentamente; alternar lados.','{}'),
('marcha-sentada','Marcha sentado','Resistencia','Elevar alternadamente los pies sentado, a ritmo cómodo.','{}'),
('apertura-brazos-sentado','Apertura de brazos sentado','Movilidad','Abrir los brazos a una altura cómoda y volver al centro sin impulso.','{}'),
('elevacion-talones-sentado','Elevación de talones sentado','Fuerza','Elevar talones y luego puntas de los pies sentado, con control.','{}'),
('prension-suave','Apretar pelota blanda','Fuerza','Apretar y soltar una pelota blanda con cada mano sin contener la respiración.','{}'),
('levantarse-sentarse','Sentarse y levantarse de una silla','Fuerza','Practicar con silla estable y supervisión; usar apoyabrazos si hace falta.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","protesis reciente","cirugia reciente","dolor agudo de rodilla","fractura reciente"}'),
('mini-sentadilla-apoyo','Mini sentadilla con apoyo','Fuerza','Flexionar poco las rodillas sujetándose de un apoyo firme.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","fractura reciente","protesis reciente","cirugia reciente","dolor agudo de rodilla"}'),
('elevacion-talones-de-pie','Elevación de talones de pie','Fuerza','De pie, con ambas manos en un apoyo estable, subir y bajar talones.','{"riesgo de caídas","mareo","vertigo","neuropatia periferica","fractura reciente","cirugia reciente"}'),
('abduccion-cadera-apoyo','Separación lateral de pierna con apoyo','Fuerza','De pie y con apoyo, alejar una pierna al costado sin inclinar el tronco.','{"riesgo de caídas","mareo","vertigo","protesis reciente","cirugia reciente","fractura reciente","dolor agudo de cadera"}'),
('extension-cadera-apoyo','Extensión de cadera con apoyo','Fuerza','Llevar suavemente una pierna hacia atrás sin arquear la espalda.','{"riesgo de caídas","mareo","vertigo","protesis reciente","cirugia reciente","fractura reciente","dolor lumbar agudo"}'),
('marcha-en-sitio','Marcha en el sitio con apoyo','Resistencia','Marchar lentamente junto a un apoyo firme; detenerse ante malestar.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","disnea en reposo"}'),
('caminata-interior','Caminata interior supervisada','Resistencia','Caminar en terreno plano y despejado, con el apoyo habitual.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","disnea en reposo","fractura reciente"}'),
('paso-lateral-apoyo','Paso lateral con apoyo','Equilibrio','Dar pasos cortos de lado frente a una superficie firme.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","fractura reciente","protesis reciente","cirugia reciente"}'),
('transferencia-peso','Transferencia de peso con apoyo','Equilibrio','Mover el peso lentamente de un pie al otro junto a una barra o encimera.','{"riesgo de caídas alto","mareo","vertigo","hipotension ortostatica","fractura reciente"}'),
('equilibrio-base-amplia','Equilibrio con base amplia y apoyo','Equilibrio','Mantenerse de pie con pies separados y manos cerca de un apoyo.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","fractura reciente"}'),
('tandem-apoyo','Marcha en línea con apoyo','Equilibrio','Practicar pasos talón-punta junto a una barra y con supervisión.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","fractura reciente","neuropatia periferica"}'),
('escalon-bajo','Subir y bajar escalón bajo','Fuerza','Usar escalón firme con baranda y supervisión cercana.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","disnea en reposo","fractura reciente","protesis reciente"}'),
('banda-remo-sentado','Remo con banda elástica sentado','Fuerza','Tirar de una banda de baja resistencia sentado, sin contener el aire.','{"infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","cirugia reciente de hombro","fractura reciente de brazo"}'),
('empuje-pared','Empuje suave contra pared','Fuerza','Empujar suavemente una pared manteniendo respiración continua.','{"infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension","glaucoma","hernia","fractura reciente de brazo","cirugia reciente de hombro"}'),
('curl-biceps-ligero','Flexión de codos con peso ligero','Fuerza','Flexionar los codos con carga muy ligera o sin peso, sentado.','{"infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","fractura reciente de brazo","cirugia reciente de hombro"}'),
('alcance-frontal-sentado','Alcance frontal sentado','Movilidad','Alcanzar al frente hasta una distancia cómoda sin inclinarse en exceso.','{"fractura reciente de columna","osteoporosis severa","dolor lumbar agudo","mareo"}'),
('rotacion-tronco-suave','Rotación suave de tronco sentado','Movilidad','Girar poco el tronco, lentamente y sin rebotes.','{"osteoporosis","fractura vertebral","fractura reciente de columna","dolor lumbar agudo","hernia discal aguda","cirugia reciente de columna"}'),
('flexion-tronco-sentado','Inclinación frontal corta sentado','Movilidad','Inclinarse apenas hacia adelante manteniendo apoyo estable.','{"osteoporosis","fractura vertebral","fractura reciente de columna","dolor lumbar agudo","hernia discal aguda","cirugia reciente de columna","glaucoma"}'),
('puente-cama','Puente corto en cama','Fuerza','Acostado boca arriba, elevar ligeramente la pelvis si resulta cómodo.','{"insuficiencia cardiaca","disnea en reposo","fractura reciente de cadera","protesis reciente de cadera","cirugia reciente de cadera","dolor lumbar agudo"}'),
('deslizamiento-talones','Deslizamiento de talón en cama','Movilidad','Acostado o semisentado, deslizar el talón acercándolo y alejándolo.','{"fractura reciente de pierna","protesis reciente de rodilla","cirugia reciente de rodilla","dolor agudo de rodilla"}'),
('estiramiento-pantorrilla','Estiramiento de pantorrilla con apoyo','Flexibilidad','Estirar suavemente la pantorrilla sin rebotes y sin dolor.','{"fractura reciente de pierna","trombosis venosa","dolor agudo de pantorrilla"}'),
('estiramiento-isquiotibial-sentado','Estiramiento posterior de muslo sentado','Flexibilidad','Extender una pierna y llevar el tronco apenas adelante, sin rebotes.','{"osteoporosis","fractura vertebral","fractura reciente de columna","hernia discal aguda","dolor lumbar agudo"}'),
('estiramiento-cuello','Movilidad suave de cuello','Movilidad','Girar la cabeza pocos grados a cada lado, sin forzar ni hacer círculos amplios.','{"vertigo","mareo","estenosis cervical","fractura cervical","cirugia reciente de cuello"}'),
('respiracion-labios-fruncidos','Respiración con labios fruncidos','Respiración','Inhalar suave por nariz y exhalar lentamente con labios fruncidos.','{}'),
('bombeo-brazos-sentado','Bombeo de brazos sentado','Resistencia','Mover los brazos alternadamente sentado a ritmo suave.','{"infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","disnea en reposo"}'),
('danza-sentada','Ritmo y coordinación sentado','Coordinación','Seguir movimientos sencillos de brazos sentado, evitando giros bruscos.','{"infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","dolor agudo de hombro"}'),
('marcha-sobre-talones-apoyo','Marcha sobre talones con apoyo','Equilibrio','Elevar la punta de los pies por pocos pasos con apoyo firme.','{"riesgo de caídas","mareo","vertigo","neuropatia periferica","fractura reciente"}'),
('marcha-sobre-puntas-apoyo','Marcha sobre puntas con apoyo','Equilibrio','Elevar los talones por pocos pasos con apoyo firme.','{"riesgo de caídas","mareo","vertigo","neuropatia periferica","fractura reciente"}'),
('paso-atras-apoyo','Paso atrás con apoyo','Equilibrio','Dar pasos cortos hacia atrás junto a una barra y con supervisión.','{"riesgo de caídas","mareo","vertigo","hipotension ortostatica","fractura reciente"}'),
('bici-estatica-suave','Bicicleta estática de baja resistencia','Resistencia','Pedalear sentado con baja resistencia y supervisión inicial.','{"infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","disnea en reposo","fractura reciente de pierna","cirugia reciente de rodilla"}'),
('levantamiento-brazo-sentado','Elevación de brazos sentado','Fuerza','Elevar los brazos solo hasta una altura cómoda, sin peso.','{"infarto reciente","angina","arritmia","insuficiencia cardiaca","hipertension no controlada","glaucoma","fractura reciente de brazo","cirugia reciente de hombro"}'),
('abduccion-cadera-sentado','Apertura de rodillas sentado','Fuerza','Separar y acercar las rodillas sentado, sin banda o con resistencia mínima.','{"fractura reciente de cadera","protesis reciente de cadera","cirugia reciente de cadera","dolor agudo de cadera"}'),
('extension-rodilla-banda','Extensión de rodilla con banda ligera','Fuerza','Extender la rodilla sentado con banda de baja resistencia.','{"fractura reciente de pierna","protesis reciente de rodilla","cirugia reciente de rodilla","dolor agudo de rodilla"}');

CREATE INDEX catalogo_ejercicios_activos_idx ON catalogo_ejercicios (categoria, nombre) WHERE activo;

CREATE TABLE planes_ejercicios (
    id UUID PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    ejercicio_id TEXT NOT NULL REFERENCES catalogo_ejercicios(id) ON DELETE RESTRICT,
    frecuencia TEXT NOT NULL CHECK (length(trim(frecuencia)) BETWEEN 1 AND 120),
    series SMALLINT NULL CHECK (series IS NULL OR series BETWEEN 1 AND 20),
    repeticiones SMALLINT NULL CHECK (repeticiones IS NULL OR repeticiones BETWEEN 1 AND 200),
    duracion_minutos SMALLINT NULL CHECK (duracion_minutos IS NULL OR duracion_minutos BETWEEN 1 AND 240),
    indicaciones TEXT NOT NULL DEFAULT '',
    asignado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    asignado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX planes_ejercicios_paciente_fecha_idx ON planes_ejercicios (paciente_id, asignado_en DESC);
