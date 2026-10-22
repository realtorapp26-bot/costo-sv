-- ============================================================
-- Costo SV — Carta de oferta en dirección propietario → comprador
-- Hasta ahora la carta de oferta solo existía en una dirección: el
-- comprador le ofrecía al propietario ('oferta'). Se agrega la dirección
-- inversa, 'oferta_venta': el propietario le ofrece en venta al comprador
-- y firma él. Necesita tres cosas en la tabla "cartas":
--   1. Aceptar el tipo nuevo en el check de "tipo".
--   2. Guardar el documento del propietario (en esta dirección el que
--      firma es él, antes el documento archivado era siempre del cliente).
--   3. Guardar la vigencia de la oferta y si queda sujeta a venta previa,
--      que son condiciones propias de la oferta del propietario.
-- ============================================================

-- El check de "tipo" se creó inline en la columna, así que Postgres lo
-- nombró solo. Se borra por definición (cualquier check de esta tabla que
-- mencione 'contraoferta') en vez de por nombre, para no depender de cómo
-- lo haya nombrado.
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
     where rel.relname = 'cartas'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%contraoferta%'
  loop
    execute format('alter table cartas drop constraint %I', c.conname);
  end loop;
end $$;

alter table cartas add constraint cartas_tipo_check
  check (tipo in ('oferta', 'oferta_venta', 'aceptacion', 'contraoferta'));

alter table cartas add column if not exists propietario_documento text;
alter table cartas add column if not exists vigencia date;
alter table cartas add column if not exists sujeto_venta_previa boolean not null default false;

-- Verificación: debe listar los cuatro tipos permitidos.
select pg_get_constraintdef(con.oid) as tipos_permitidos
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
 where rel.relname = 'cartas' and con.conname = 'cartas_tipo_check';
