-- Golden Lake va a mostrar varios videos (los clips de dron), no solo uno —
-- reemplaza el campo video_url (todavía sin datos guardados, es seguro) por
-- un arreglo, mismo patrón que "fotos" y "amenidades".
alter table proyectos add column videos text[] not null default '{}';
alter table proyectos drop column video_url;
