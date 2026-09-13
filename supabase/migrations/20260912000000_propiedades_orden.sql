-- Orden manual de aparición de las propiedades en el sitio público
-- (más bajo = aparece primero). Null = sin ordenar manualmente todavía,
-- cae al final y se ordena por fecha de creación como hasta ahora.
alter table propiedades add column if not exists orden integer;
