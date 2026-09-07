-- Fecha en que el listado se publicó en el portal de origen (RE/MAX).
-- Se captura al subir la propiedad (extracción del código fuente / IA) y se
-- muestra en la ficha pública ("Publicado: 3 de septiembre de 2026").
alter table propiedades add column if not exists fecha_publicacion date;
