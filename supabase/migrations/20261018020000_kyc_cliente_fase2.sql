-- KYC Fase 2: el cliente completa su parte por un link público
-- (kyc-cliente.html) y firma -- igual al patrón de carta-oferta.html.
-- Estas columnas se llenan server-side (service_role, vía
-- lib/guardarKyc.js) cuando el cliente envía el formulario, nunca desde
-- el navegador del cliente directamente.

alter table kyc_solicitudes
  add column if not exists cliente_fecha_nacimiento date,
  add column if not exists cliente_nacionalidad text,
  add column if not exists cliente_pais_residencia text,
  add column if not exists cliente_direccion text,
  add column if not exists cliente_documento_tipo text
    check (cliente_documento_tipo in ('DUI', 'NIT', 'PASAPORTE')),
  add column if not exists cliente_documento_numero text,
  add column if not exists cliente_telefono text,
  add column if not exists cliente_ocupacion text,
  add column if not exists pdf_path text,
  add column if not exists completado_at timestamptz;
