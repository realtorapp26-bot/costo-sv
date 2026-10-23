-- ============================================================
-- Costo SV — Golden Lake: correcciones de Walter al listado
--  1. "sin entrada aparte" no se entendía: la membresía se nombra y
--     listo, con los dos años que sí son parte del trato.
--  2. La línea blanca NO viene incluida (de los electrodomésticos solo
--     el aire acondicionado), así que el punto del mobiliario tiene que
--     decirlo junto a lo de las camas.
--  3. Se quita "aire acondicionado en todas las habitaciones": por ahora
--     no está confirmado y la carta la firma Walter.
-- ============================================================

update oferta_borradores
   set inventario = coalesce((
       select jsonb_agg(
                case
                  when elemento->>'item' ilike '%Tesoro Beach%'
                    then jsonb_set(elemento, '{item}',
                         '"Membresía VIP del Hotel Tesoro Beach por dos años"'::jsonb)
                  when elemento->>'item' ilike '%amueblada%'
                    then jsonb_set(elemento, '{item}',
                         '"Casa amueblada (el mobiliario no incluye camas ni línea blanca)"'::jsonb)
                  else elemento
                end
                order by orden)
         from jsonb_array_elements(inventario) with ordinality as t(elemento, orden)
        where elemento->>'item' not ilike '%en todas las habitaciones%'
   ), '[]'::jsonb)
 where nombre like 'Golden Lake%';

-- Verificación: 19 puntos, con la membresía y el mobiliario ya corregidos.
select jsonb_array_length(inventario) as puntos
  from oferta_borradores
 where nombre like 'Golden Lake%';

select e->>'item' as punto
  from oferta_borradores, jsonb_array_elements(inventario) e
 where nombre like 'Golden Lake%'
   and (e->>'item' ilike '%Tesoro%' or e->>'item' ilike '%amueblada%' or e->>'item' ilike '%acondicionado%');
