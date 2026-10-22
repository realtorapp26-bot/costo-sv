-- ============================================================
-- Costo SV — Precio de lista autorizado en los borradores de Carta de Oferta
-- El precio de lista (el que el propietario autorizó en el contrato de
-- comercialización firmado) es distinto del monto que el comprador ofrece.
-- La carta muestra los dos y la diferencia entre ellos, para que quede
-- claro cuánto se está negociando.
-- ============================================================

alter table oferta_borradores add column if not exists precio_lista numeric;

update oferta_borradores
   set precio_lista = 365000
 where nombre = 'Beach Ranch - David Bamford';
