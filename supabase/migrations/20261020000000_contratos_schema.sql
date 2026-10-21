-- ============================================================
-- Costo SV — Contratos de comercialización (autorización de venta)
-- Acuerdo entre Vendedor y Corredor: precio, tipo de listado, comisión,
-- plazo, protección e inventario de bienes incluidos. El corredor firma en
-- el panel al crear el contrato; el vendedor firma a distancia por un link
-- público (contrato-firma.html), que completa su parte vía /api/lead
-- (service_role, sin pasar por RLS -- mismo patrón que kyc_solicitudes).
-- ============================================================

create sequence if not exists contrato_folio_seq;

create table contratos_comercializacion (
    id uuid primary key default gen_random_uuid(),
    numero text not null unique,
    fecha_acuerdo date not null default current_date,

    vendedor_nombre text not null,
    corredor_nombre text not null,

    propiedad_descripcion text not null,
    propiedad_registro text,
    propiedad_direccion text,
    propiedad_gravamenes text,
    propiedad_certificado text,

    precio_lista numeric not null,
    tipo_listado text not null default 'no_exclusivo'
        check (tipo_listado in ('exclusivo', 'no_exclusivo')),
    comision_porcentaje numeric not null default 5,
    comision_incluye_iva boolean not null default true,
    plazo_meses integer not null default 6,
    plazo_inicio date not null default current_date,
    plazo_fin date not null,
    periodo_proteccion_dias integer not null default 180,

    inventario jsonb not null default '[]',
    notas text,

    estado text not null default 'pendiente'
        check (estado in ('pendiente', 'firmado', 'cancelado')),

    corredor_firma_path text,
    vendedor_firma_nombre text,
    vendedor_firma_fecha date,
    pdf_path text,
    completado_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index contratos_estado_idx on contratos_comercializacion(estado);
create index contratos_created_at_idx on contratos_comercializacion(created_at desc);

create or replace function generar_numero_contrato() returns trigger as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'COM-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('contrato_folio_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger contratos_numero before insert on contratos_comercializacion
  for each row execute function generar_numero_contrato();

alter table contratos_comercializacion enable row level security;

create policy "autenticados leen contratos" on contratos_comercializacion
    for select to authenticated using (true);
create policy "autenticados crean contratos" on contratos_comercializacion
    for insert to authenticated with check (true);
create policy "autenticados editan contratos" on contratos_comercializacion
    for update to authenticated using (true);
create policy "autenticados eliminan contratos" on contratos_comercializacion
    for delete to authenticated using (true);

-- Bucket privado: firma del corredor (PNG) + PDF firmado final. NO reusar
-- "ofertas" ni "kyc-documentos" -- documentos legales propios de este módulo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos-documentos', 'contratos-documentos', false, 20971520,
        array['image/png', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "contratos-documentos: subir autenticados" on storage.objects
  for insert to authenticated with check (bucket_id = 'contratos-documentos');
create policy "contratos-documentos: leer autenticados" on storage.objects
  for select to authenticated using (bucket_id = 'contratos-documentos');
