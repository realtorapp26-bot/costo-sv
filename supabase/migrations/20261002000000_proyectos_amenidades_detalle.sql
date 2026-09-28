-- Guarda titulo + etiqueta + descripcion + destacada de cada amenidad
-- juntos, en el mismo orden que "amenidades_fotos". Reemplaza al viejo
-- campo "amenidades" (solo titulos sueltos, sin descripcion) como fuente
-- de verdad para las tarjetas de Golden Lake; "amenidades" se sigue
-- llenando en paralelo (solo con los titulos) por compatibilidad con
-- cualquier lugar que todavia lo lea como lista simple.
alter table proyectos add column amenidades_detalle jsonb not null default '[]';
