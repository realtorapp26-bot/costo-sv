-- ============================================================
-- Costo SV — Precisión en el borrador de Golden Lake
-- La membresía a Tesoro Beach que viene incluida con la compra son dos
-- años, dato que faltaba en el punto del listado. Se reemplaza solo ese
-- elemento, buscándolo por su texto y no por su posición, para no
-- depender del orden ni pisar el resto del inventario.
-- ============================================================

update oferta_borradores
   set inventario = (
       select jsonb_agg(
                case when elemento->>'item' ilike '%Tesoro Beach%'
                     then jsonb_set(
                            elemento,
                            '{item}',
                            '"Membresía VIP a Tesoro Beach por dos años, incluida con la compra y sin entrada aparte"'::jsonb)
                     else elemento
                end
                order by orden)
         from jsonb_array_elements(inventario) with ordinality as t(elemento, orden)
   )
 where nombre like 'Golden Lake%';

-- Verificación: debe mostrar el punto ya con los dos años.
select e->>'item' as punto
  from oferta_borradores, jsonb_array_elements(inventario) e
 where nombre like 'Golden Lake%'
   and e->>'item' ilike '%Tesoro Beach%';
