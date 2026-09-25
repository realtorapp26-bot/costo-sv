-- Descripción del modelo de casa nueva (la de las plantas arquitectónicas):
-- resumen corto tipo "4 Habitaciones · 5 Baños · ..." (se separa por "·" y se
-- muestra con íconos) + el texto completo organizado por nivel.
alter table proyectos add column modelo_nombre text;
alter table proyectos add column modelo_stats text;
alter table proyectos add column modelo_descripcion text;
