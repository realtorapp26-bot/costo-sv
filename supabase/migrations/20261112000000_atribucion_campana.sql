-- ============================================================
-- Costo SV — Atribución de campaña en leads y métricas
--
-- Problema que resuelve: hasta ahora un lead entraba con origen
-- 'formulario_web' o 'whatsapp' y nada más. No había forma de saber si lo
-- trajo una pauta de Meta, un posteo orgánico o una búsqueda — así que
-- "esta campaña funcionó / no funcionó" no se podía responder con datos,
-- solo por sensación.
--
--  * leads.campana   — etiquetas del anuncio que trajo a la persona
--                      (source / medium / campaign de la URL, o el nombre
--                      del anuncio cuando viene de Facebook Lead Ads).
--  * leads.pagina    — en qué página del sitio convirtió.
--  * eventos.campana — lo mismo para las visitas, no solo para los leads:
--                      sin esto se sabe cuántos leads dio una campaña, pero
--                      no cuánta gente trajo, que es justo la diferencia
--                      entre "no llegó nadie" y "llegaron y no escribieron".
-- ============================================================

alter table leads add column if not exists campana text;
alter table leads add column if not exists pagina text;

create index if not exists leads_campana_idx on leads(campana) where campana is not null;

alter table eventos add column if not exists campana text;

create index if not exists eventos_campana_idx on eventos(campana) where campana is not null;

-- El RPC gana un parámetro. Se borra la versión de 3 parámetros para no
-- dejar dos funciones con el mismo nombre (una llamada con 3 argumentos
-- quedaría ambigua). El sitio ya desplegado sigue funcionando igual: manda
-- los parámetros por nombre y p_campana tiene valor por defecto.
drop function if exists registrar_evento_publico(text, text, text);

create or replace function registrar_evento_publico(
  p_tipo text,
  p_pagina text,
  p_detalle text default null,
  p_campana text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into eventos (tipo, pagina, detalle, campana)
  values (p_tipo, p_pagina, p_detalle, p_campana);
end;
$$;

revoke all on function registrar_evento_publico(text, text, text, text) from public;
grant execute on function registrar_evento_publico(text, text, text, text) to anon;

-- Verificación: las dos columnas nuevas y el RPC con 4 parámetros.
select column_name
  from information_schema.columns
 where table_name = 'leads' and column_name in ('campana', 'pagina');

select pg_get_function_identity_arguments(oid) as parametros
  from pg_proc
 where proname = 'registrar_evento_publico';
