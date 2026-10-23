-- ============================================================
-- Costo SV — Golden Lake: el terreno depende de la porción
-- El listado de la carta decía "Terreno de 300 m² (10 x 30 m)", que es la
-- medida del modelo y calzaba con el lote 5 (ya vendido). De lo que
-- queda, el lote 4 da porciones de ~324.5 m² pero el lote 3 da ~235.82,
-- sesenta y cinco metros menos de lo que la carta prometía. Se cambia por
-- el rango real, confirmado contra el cuadro de áreas del plano y la
-- escritura del lote 5 porción 2 (314.57 m²).
-- ============================================================

update oferta_borradores
   set inventario = (
       select jsonb_agg(
                case when elemento->>'item' ilike '%Terreno de 300%'
                     then jsonb_set(
                            elemento,
                            '{item}',
                            '"Terreno con título propio; la medida depende de la porción elegida (de 235.82 m² a 324.57 m²)"'::jsonb)
                     else elemento
                end
                order by orden)
         from jsonb_array_elements(inventario) with ordinality as t(elemento, orden)
   )
 where nombre like 'Golden Lake%';

-- Verificación: el punto del terreno ya no debe prometer 300 m².
select e->>'item' as punto
  from oferta_borradores, jsonb_array_elements(inventario) e
 where nombre like 'Golden Lake%'
   and e->>'item' ilike '%terreno%';
