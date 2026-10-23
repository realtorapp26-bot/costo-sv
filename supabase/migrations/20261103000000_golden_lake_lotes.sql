-- ============================================================
-- Costo SV — Golden Lake: lotes disponibles en el borrador
-- La dirección del borrador nombraba el Lote 5, que ya se vendió
-- completo. Queda la dirección del polígono, y la disponibilidad pasa a
-- las notas con fecha, para que la carta no afirme algo que caduca sin
-- que nadie se entere.
-- Al 22/10/2026 quedan: Lote 4 porciones 1 y 2, y Lote 3 porción 2.
-- ============================================================

update oferta_borradores
   set propiedad_direccion = 'Residencial Golden Lake, Bulevar Costa del Sol — Polígono 7, sobre Calle Barcelona',
       notas_adicionales = 'Promoción válida únicamente para compras en planos. La construcción de la vivienda inicia una vez que queda reservada. Disponibilidad a la fecha de esta carta: Polígono 7, Lote 4 porciones 1 y 2, y Lote 3 porción 2.'
 where nombre like 'Golden Lake%';

-- Verificación.
select nombre, propiedad_direccion, notas_adicionales
  from oferta_borradores
 where nombre like 'Golden Lake%';
