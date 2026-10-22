-- ============================================================
-- Costo SV — Datos del inmueble en los borradores de Carta de Oferta
-- Así el agente manda un link con ?borrador=<id> y al cliente le llega la
-- carta ya con el tipo de oferta, el inmueble y las condiciones cargadas:
-- solo tiene que poner sus datos personales, el monto que ofrece y firmar.
-- ============================================================

alter table oferta_borradores add column if not exists tipo_oferta text;
alter table oferta_borradores add column if not exists ciudad_emision text;
alter table oferta_borradores add column if not exists propiedad_municipio text;
alter table oferta_borradores add column if not exists propiedad_departamento text;
alter table oferta_borradores add column if not exists propiedad_direccion text;

update oferta_borradores
   set tipo_oferta = 'VENTA',
       ciudad_emision = 'San Salvador',
       propiedad_municipio = 'San Luis La Herradura',
       propiedad_departamento = 'La Paz',
       propiedad_direccion = 'Canton El Zapote, Playas de Jaltepeque'
 where nombre = 'Beach Ranch - David Bamford';
