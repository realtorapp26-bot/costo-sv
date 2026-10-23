-- ============================================================
-- Costo SV — Pendientes juntos: carta de presentación + Golden Lake al día
--
-- Reemplaza a estas migraciones, que quedaron sin aplicar y cuyos textos
-- fueron corregidos después por información nueva de Walter:
--   20261031000000_cartas_presentacion.sql
--   20261101000000_golden_lake_tesoro_beach.sql
--   20261102000000_golden_lake_disponibilidad.sql
--   20261103000000_golden_lake_lotes.sql
--   20261104000000_golden_lake_terreno.sql
-- Aplicar solo este archivo deja todo en el estado final. Correr alguno de
-- los anteriores después de este lo dejaría desactualizado.
--
-- Es idempotente: se puede correr dos veces sin romper nada.
-- ============================================================

-- ---------- 1. Archivar la carta de presentación "a quien interese" -------
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

-- ---------- 2. Golden Lake: inmueble, pago y disponibilidad --------------
-- Ya no se promete la entrega de diciembre (esa unidad se vendió) y la
-- dirección deja de nombrar el Lote 5 porción 2. La disponibilidad va en
-- las notas y fechada, porque caduca.
update oferta_borradores
   set propiedad_direccion = 'Residencial Golden Lake, Bulevar Costa del Sol — Polígono 7, sobre Calle Barcelona',
       payment_details     = 'Reserva con el 30% de prima al firmar la promesa de venta y el saldo contra la entrega de la vivienda. La construcción inicia una vez reservada la casa.',
       notas_adicionales   = 'Promoción válida únicamente para compras en planos. La construcción de la vivienda inicia una vez que queda reservada. Disponibilidad a la fecha de esta carta: la única porción segregada y disponible es la porción 1 del Polígono 7, Lote 5 (308.33 m²); la siguiente porción se segrega una vez vendida esta.'
 where nombre like 'Golden Lake%';

-- ---------- 3. Los dos puntos del listado que cambiaron ------------------
-- Membresía: son dos años, no solo "incluida".
-- Terreno: decía 300 m² (medida del modelo). La única porción disponible
-- mide 308.33 m² según escritura, así que se declara esa.
update oferta_borradores
   set inventario = (
       select jsonb_agg(
                case
                  when elemento->>'item' ilike '%Tesoro Beach%'
                    then jsonb_set(elemento, '{item}',
                         '"Membresía VIP a Tesoro Beach por dos años, incluida con la compra y sin entrada aparte"'::jsonb)
                  when elemento->>'item' ilike '%Terreno%'
                    then jsonb_set(elemento, '{item}',
                         '"Terreno de 308.33 m² (441 v²) con título propio"'::jsonb)
                  else elemento
                end
                order by orden)
         from jsonb_array_elements(inventario) with ordinality as t(elemento, orden)
   )
 where nombre like 'Golden Lake%';

-- ---------- Verificación -------------------------------------------------
select pg_get_constraintdef(con.oid) as tipos_de_carta_permitidos
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
 where rel.relname = 'cartas' and con.conname = 'cartas_tipo_check';

select e->>'item' as punto_corregido
  from oferta_borradores, jsonb_array_elements(inventario) e
 where nombre like 'Golden Lake%'
   and (e->>'item' ilike '%Tesoro Beach%' or e->>'item' ilike '%Terreno%');
