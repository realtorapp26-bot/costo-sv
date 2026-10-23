-- ============================================================
-- Costo SV — Carta de presentación "a quien interese"
-- Tercera dirección de la carta: no hay comprador ni vendedor, la firma
-- el asesor para hacer constar lo que ofrece un proyecto. Se archiva
-- como tipo 'presentacion'.
-- ============================================================

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
  check (tipo in ('oferta', 'oferta_venta', 'presentacion', 'aceptacion', 'contraoferta'));

-- Verificación: deben aparecer los cinco tipos.
select pg_get_constraintdef(con.oid) as tipos_permitidos
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
 where rel.relname = 'cartas' and con.conname = 'cartas_tipo_check';
