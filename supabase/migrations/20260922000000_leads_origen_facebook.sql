-- Agrega 'facebook_ads' a los valores válidos de leads.origen, para los
-- leads que van a llegar desde el webhook de Meta Lead Ads (api/facebook-leadgen.js).
-- Busca el nombre real del check constraint en vez de asumirlo, por si
-- Postgres lo autogeneró con otro nombre.
do $$
declare
  c text;
begin
  select con.conname into c
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'leads' and con.contype = 'c' and pg_get_constraintdef(con.oid) like '%origen%';
  if c is not null then
    execute format('alter table leads drop constraint %I', c);
  end if;
end $$;

alter table leads add constraint leads_origen_check
  check (origen in ('whatsapp', 'formulario_web', 'marketplace', 'referido', 'otro', 'facebook_ads'));
