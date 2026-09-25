-- Plantas arquitectónicas (Nivel 1, Nivel 2, etc.) — sección aparte y seria,
-- distinta de la galería de fotos del desarrollo. Mismo patrón que fotos/videos.
alter table proyectos add column plantas text[] not null default '{}';
