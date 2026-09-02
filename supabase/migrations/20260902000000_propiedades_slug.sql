-- Slug legible por propiedad, para las páginas /propiedad/<slug> (pauta / SEO).
-- El slug se genera solo desde el título al insertar; NO se regenera si luego
-- se edita el título (las URLs publicadas quedan estables). Si querés forzar un
-- slug nuevo, poné la columna en NULL y guardá: el trigger lo vuelve a calcular.

alter table propiedades add column if not exists slug text;

create or replace function propiedades_set_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidato text;
  n int := 0;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;

  base := lower(coalesce(new.titulo, 'propiedad'));
  base := translate(base,
    'áàäâãéèëêíìïîóòöôõúùüûñç',
    'aaaaaeeeeiiiiooooouuuunc');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  -- recorta a 50 y limpia el guion que pueda quedar colgando tras el corte
  base := btrim(left(btrim(base, '-'), 50), '-');
  if base = '' then base := 'propiedad'; end if;

  candidato := base;
  while exists (select 1 from propiedades where slug = candidato and id <> new.id) loop
    n := n + 1;
    candidato := base || '-' || n;
  end loop;

  new.slug := candidato;
  return new;
end;
$$;

drop trigger if exists trg_propiedades_slug on propiedades;
create trigger trg_propiedades_slug
  before insert or update on propiedades
  for each row execute function propiedades_set_slug();

-- Backfill: recalcula el slug de las filas que aún no lo tienen.
update propiedades set slug = null where slug is null or btrim(slug) = '';

create unique index if not exists propiedades_slug_uidx
  on propiedades (slug) where slug is not null;
