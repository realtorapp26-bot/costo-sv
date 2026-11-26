-- ============================================================
--  "Mis Propiedades" — captaciones propias de Walter
--
--  Hasta ahora "destacada" en el panel significaba solamente "la que quedó
--  primera en la lista manual" (idx === 0 en propiedades-admin.html). No era
--  un dato: dependía del orden, así que mover una tarjeta cambiaba cuál era
--  la destacada. Esta columna lo vuelve un dato explícito.
--
--  captacion_propia = true  ->  Walter la captó él, con contrato de corretaje
--                               firmado directamente con el propietario.
--  captacion_propia = false ->  viene de RE/MAX Connect / de otro asociado.
--
--  Las captaciones propias son las que el sitio muestra como destacadas: la
--  portada las pone primero y propiedades.html las agrupa arriba.
-- ============================================================

alter table propiedades
    add column if not exists captacion_propia boolean not null default false;

comment on column propiedades.captacion_propia is
    'true = captación propia con contrato directo (las "Mis Propiedades" del panel). Son las que el sitio destaca.';

-- Índice parcial: las consultas solo piden las que están en true, y son pocas
-- frente al total, así que no hace falta indexar las 50+ que están en false.
create index if not exists propiedades_captacion_propia_idx
    on propiedades (captacion_propia)
    where captacion_propia;

-- ------------------------------------------------------------
--  Correcciones de datos encontradas al revisar las publicaciones
-- ------------------------------------------------------------

-- 1) Una nota interna de edición quedó guardada como el TIPO de la propiedad
--    y se estaba mostrando en la ficha pública (en la lista de características)
--    y en el PDF del dossier:
--       Rancho 77, Lote 239 (en vez de "Rancho de playa")
update propiedades
   set tipo_propiedad_detalle = 'Rancho de playa'
 where slug = 'rancho-77'
   and tipo_propiedad_detalle like '%en vez de%';

-- 2) Precios escritos con puntos de miles al estilo europeo o sin separador.
--    El sitio ya los normaliza al mostrarlos (lib/formato.js + app.js), pero
--    se limpian también en la base para que el panel y las exportaciones no
--    sigan mostrando el valor crudo.
update propiedades set precio = '$950,000' where slug = 'rancho-77'  and precio = '$950.000.00';
update propiedades set precio = '$125,000' where slug = 'terreno-golden-lake-costa-del-sol' and precio = '$125000';
