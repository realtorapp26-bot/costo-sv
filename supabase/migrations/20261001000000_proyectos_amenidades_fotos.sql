-- Fotos por amenidad, separadas de las fotos generales del desarrollo
-- (columna "fotos"). Mismo orden que la columna "amenidades": la foto en
-- la posición N es la de la amenidad N.
alter table proyectos add column amenidades_fotos text[] not null default '{}';
