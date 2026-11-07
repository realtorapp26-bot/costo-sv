-- ============================================================
-- Costo SV — Respuestas y calificación de los leads de Meta Lead Ads
--
-- El formulario instantáneo de Golden Lake pregunta propósito, presupuesto
-- y plazo. Hasta ahora todo eso caía junto dentro de "notas", en texto
-- corrido: no se podía filtrar, ordenar ni priorizar a quién llamar
-- primero. Estas columnas lo separan.
--
--  * meta_leadgen_id — id del lead en Meta. ÚNICO: es lo que evita que un
--                      lead se duplique si entra por webhook y además se
--                      recupera a mano (backfill).
--  * fecha_ingreso   — cuándo lo envió la persona (created_time de Meta),
--                      que no es lo mismo que cuándo lo guardamos nosotros.
--  * respuestas_raw  — field_data completo tal como lo manda Meta. Es la
--                      red de seguridad: si el mapeo de alguna pregunta
--                      falla, el dato igual quedó y se puede recuperar.
-- ============================================================

alter table leads add column if not exists meta_leadgen_id text;
alter table leads add column if not exists fecha_ingreso timestamptz;
alter table leads add column if not exists proposito text;
alter table leads add column if not exists presupuesto text;
alter table leads add column if not exists plazo text;
alter table leads add column if not exists prioridad text;
alter table leads add column if not exists formulario text;
alter table leads add column if not exists respuestas_raw jsonb;

-- Único pero permitiendo muchos nulos: los leads del sitio no tienen id de Meta.
create unique index if not exists leads_meta_leadgen_id_idx
  on leads(meta_leadgen_id) where meta_leadgen_id is not null;

create index if not exists leads_prioridad_idx on leads(prioridad) where prioridad is not null;
create index if not exists leads_fecha_ingreso_idx on leads(fecha_ingreso desc nulls last);

-- Se agrega como constraint aparte para poder nombrarla y que acepte null.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_prioridad_check') then
    alter table leads add constraint leads_prioridad_check
      check (prioridad is null or prioridad in ('caliente', 'tibio', 'frio'));
  end if;
end $$;

-- Verificación: deben aparecer las 8 columnas nuevas.
select column_name, data_type
  from information_schema.columns
 where table_name = 'leads'
   and column_name in ('meta_leadgen_id', 'fecha_ingreso', 'proposito',
                       'presupuesto', 'plazo', 'prioridad', 'formulario', 'respuestas_raw')
 order by column_name;
