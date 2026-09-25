-- Lista de inclusiones de la promoción del modelo de casa nueva (línea
-- blanca, A/C, agua caliente, etc.), editable desde el panel igual que
-- amenidades: un texto por línea.
alter table proyectos add column modelo_incluye text[] not null default '{}';
