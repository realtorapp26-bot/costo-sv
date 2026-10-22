-- ============================================================
-- Costo SV — Archivo de cartas (ofertas, aceptaciones y contraofertas)
-- Hasta ahora el PDF firmado se subía al bucket "ofertas" y quedaba
-- colgado del lead, sin registro de QUÉ se firmó y sin un lugar donde
-- verlos todos juntos. Esta tabla archiva cada carta generada con sus
-- términos, para poder consultarla y descargar el PDF desde el panel.
-- El PDF sigue en el bucket "ofertas", ahora bajo "cartas/<id>.pdf".
-- ============================================================

create sequence if not exists carta_folio_seq;

create table cartas (
    id uuid primary key default gen_random_uuid(),
    numero text not null unique,

    tipo text not null check (tipo in ('oferta', 'aceptacion', 'contraoferta')),
    transaccion text not null default 'VENTA' check (transaccion in ('VENTA', 'ALQUILER')),
    idioma text not null default 'es',

    -- Partes: en una oferta firma el cliente; en una respuesta, el propietario.
    cliente_nombre text,
    cliente_documento text,
    propietario_nombre text,

    propiedad_municipio text,
    propiedad_departamento text,
    propiedad_direccion text,

    monto numeric,
    precio_lista numeric,
    forma_pago text,
    detalle_pago text,
    plazo text,

    bienes jsonb not null default '[]',
    gastos_cierre jsonb,
    notas text,

    pdf_path text,
    lead_id uuid,
    created_at timestamptz not null default now()
);

create index cartas_created_at_idx on cartas(created_at desc);
create index cartas_tipo_idx on cartas(tipo);

create or replace function generar_numero_carta() returns trigger as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'CAR-' || to_char(now(), 'YYMMDD') || '-' ||
                  lpad(nextval('carta_folio_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger cartas_numero before insert on cartas
  for each row execute function generar_numero_carta();

alter table cartas enable row level security;

-- Las cartas las inserta el servidor con service_role (que salta RLS) desde
-- /api/lead; el panel solo lee y borra.
create policy "autenticados leen cartas" on cartas
    for select to authenticated using (true);
create policy "autenticados eliminan cartas" on cartas
    for delete to authenticated using (true);
