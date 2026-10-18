-- KYC / Cumplimiento -- expediente de diligencia por cliente, creado por el
-- agente desde el panel (clásico y nuevo). Fase 1: alta + listado; el link
-- público para que el cliente complete su parte queda para una fase futura.

create extension if not exists "pgcrypto";
create sequence if not exists kyc_folio_seq;

create table kyc_solicitudes (
    id uuid primary key default gen_random_uuid(),
    numero text not null unique,
    oficina text not null default 'RE/MAX Elite El Salvador',
    solicitante text not null default 'Walter Guerrero',
    cliente_tipo text not null default 'persona_natural'
        check (cliente_tipo in ('persona_natural', 'persona_juridica')),
    cliente_nombre text not null,
    cliente_correo text,
    motivo_diligencia text not null check (char_length(motivo_diligencia) <= 1000),
    estado text not null default 'pendiente'
        check (estado in ('pendiente', 'cerrado', 'cancelado')),
    doc_frontal_path text,
    doc_reverso_path text,
    vence_at date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index kyc_solicitudes_estado_idx on kyc_solicitudes(estado);
create index kyc_solicitudes_created_at_idx on kyc_solicitudes(created_at desc);

-- Folio humano "KYC-AAMMDD-NNNNNN", asignado al crear (no se edita a mano).
create or replace function generar_numero_kyc() returns trigger as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'KYC-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('kyc_folio_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger kyc_solicitudes_numero before insert on kyc_solicitudes
  for each row execute function generar_numero_kyc();

alter table kyc_solicitudes enable row level security;

create policy "autenticados leen kyc" on kyc_solicitudes
    for select to authenticated using (true);
create policy "autenticados crean kyc" on kyc_solicitudes
    for insert to authenticated with check (true);
create policy "autenticados editan kyc" on kyc_solicitudes
    for update to authenticated using (true);
create policy "autenticados eliminan kyc" on kyc_solicitudes
    for delete to authenticated using (true);

-- Bucket PRIVADO para documentos de identidad -- NO reusar "fichas-fotos"
-- (ese es público). Hasta 20MB por archivo, PDF/JPG/PNG solamente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc-documentos', 'kyc-documentos', false, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "kyc-documentos: subir autenticados" on storage.objects
  for insert to authenticated with check (bucket_id = 'kyc-documentos');
create policy "kyc-documentos: leer autenticados" on storage.objects
  for select to authenticated using (bucket_id = 'kyc-documentos');
