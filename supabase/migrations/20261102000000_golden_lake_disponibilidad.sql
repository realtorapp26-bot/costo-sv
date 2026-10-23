-- ============================================================
-- Costo SV — Golden Lake: la casa de entrega en diciembre ya se vendió
-- El borrador decía que la vivienda se entregaba en diciembre de 2026.
-- Esa unidad ya no está disponible: ahora la construcción arranca cuando
-- la casa queda reservada, y la promoción aplica únicamente a compras en
-- planos. Se corrige el texto que iba a salir impreso en la carta.
-- ============================================================

update oferta_borradores
   set payment_details = 'Reserva con el 30% de prima al firmar la promesa de venta y el saldo contra la entrega de la vivienda. La construcción inicia una vez reservada la casa.',
       notas_adicionales = 'Promoción válida únicamente para compras en planos. La construcción de la vivienda inicia una vez que queda reservada.'
 where nombre like 'Golden Lake%';

-- Verificación: ni el pago ni las notas deben mencionar diciembre.
select nombre, payment_details, notas_adicionales
  from oferta_borradores
 where nombre like 'Golden Lake%';
