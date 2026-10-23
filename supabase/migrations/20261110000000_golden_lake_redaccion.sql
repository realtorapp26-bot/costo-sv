-- ============================================================
-- Costo SV — Golden Lake: dos repeticiones en el texto de la carta
--  1. "La construcción inicia una vez reservada" aparecía dos veces: en
--     las condiciones de pago y otra vez en las notas. Queda solo en las
--     condiciones de pago, que es donde corresponde.
--  2. El título del listado venía bilingüe ("Lo que incluye Golden Lake /
--     What Golden Lake includes"), pero los puntos del listado se
--     imprimen siempre en español: el título a dos idiomas quedaba
--     desparejo. Se deja en español, igual que su contenido.
-- ============================================================

update oferta_borradores
   set titulo_inventario = 'Lo que incluye Golden Lake',
       notas_adicionales = 'Promoción válida únicamente para compras en planos. Disponibilidad a la fecha de esta carta: la única porción segregada y disponible es la porción 1 del Polígono 7, Lote 5 (308.33 m²); la siguiente porción se segrega una vez vendida esta.'
 where nombre like 'Golden Lake%';

-- Verificación.
select titulo_inventario, notas_adicionales
  from oferta_borradores
 where nombre like 'Golden Lake%';
