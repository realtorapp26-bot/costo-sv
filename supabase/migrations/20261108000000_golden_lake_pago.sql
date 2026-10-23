-- ============================================================
-- Costo SV — Golden Lake: las condiciones de pago solo hasta la reserva
-- El texto decía "...y el saldo contra la entrega de la vivienda". Esa
-- parte se saca: la carta nombra la reserva del 30% y nada más, porque
-- la forma de pagar el saldo se acuerda aparte y no corresponde dejarla
-- escrita en una carta de presentación.
-- ============================================================

update oferta_borradores
   set payment_details = 'Reserva con el 30% de prima al firmar la promesa de venta. La construcción inicia una vez reservada la casa.'
 where nombre like 'Golden Lake%';

-- Verificación: no debe quedar nada del saldo contra entrega.
select payment_method, payment_details
  from oferta_borradores
 where nombre like 'Golden Lake%';
