-- ============================================================
-- Costo SV — Golden Lake: el mobiliario no incluye camas
-- El punto decía "Casa amueblada, con línea blanca incluida", que se
-- puede leer como que viene todo. El precio incluye el mobiliario, los
-- aires acondicionados y el mueble de cuarzo blanco de la cocina, pero
-- NO las camas: conviene que esté escrito donde el cliente lee lo que
-- entra, y no solo dicho de palabra.
-- ============================================================

update oferta_borradores
   set inventario = (
       select jsonb_agg(
                case when elemento->>'item' ilike '%amueblada%'
                     then jsonb_set(elemento, '{item}',
                          '"Casa amueblada, con línea blanca incluida (el mobiliario no incluye camas)"'::jsonb)
                     else elemento
                end
                order by orden)
         from jsonb_array_elements(inventario) with ordinality as t(elemento, orden)
   )
 where nombre like 'Golden Lake%';

-- Verificación.
select e->>'item' as punto
  from oferta_borradores, jsonb_array_elements(inventario) e
 where nombre like 'Golden Lake%'
   and e->>'item' ilike '%amueblada%';
