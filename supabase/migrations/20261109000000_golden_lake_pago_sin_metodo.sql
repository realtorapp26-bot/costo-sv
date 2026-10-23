-- ============================================================
-- Costo SV — Golden Lake: sin forma de pago declarada
-- Walter todavía no puede confirmar con el constructor cómo se paga el
-- saldo, así que la carta no debe afirmar "Contado", "Crédito" ni
-- "Mixto": queda solo la reserva del 30%, que sí está confirmada.
-- La carta imprime las condiciones escritas aunque no haya método.
-- ============================================================

update oferta_borradores
   set payment_method  = null,
       payment_details = 'Reserva con el 30% de prima al firmar la promesa de venta. La construcción inicia una vez reservada la casa.'
 where nombre like 'Golden Lake%';

-- Verificación: method en null y el detalle solo con la reserva.
select payment_method, payment_details
  from oferta_borradores
 where nombre like 'Golden Lake%';
