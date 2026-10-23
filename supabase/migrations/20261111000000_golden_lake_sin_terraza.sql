-- ============================================================
-- Costo SV — Golden Lake: se quita la terraza de toda la fachada
-- Walter lo revisó contra el contrato: ese punto sale del listado de la
-- carta. Se borra por su texto, no por posición, para no depender del
-- orden del inventario.
-- ============================================================

update oferta_borradores
   set inventario = coalesce((
       select jsonb_agg(elemento order by orden)
         from jsonb_array_elements(inventario) with ordinality as t(elemento, orden)
        where elemento->>'item' not ilike '%terraza cubierta%'
   ), '[]'::jsonb)
 where nombre like 'Golden Lake%';

-- Verificación: debe quedar en 18 puntos y sin la terraza.
select jsonb_array_length(inventario) as puntos
  from oferta_borradores
 where nombre like 'Golden Lake%';

select e->>'item' as punto
  from oferta_borradores, jsonb_array_elements(inventario) e
 where nombre like 'Golden Lake%'
   and e->>'item' ilike '%terraza%';
