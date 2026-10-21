-- ============================================================
-- Costo SV — Borradores de Carta de Oferta
-- A diferencia de contrato_borradores, acá la LECTURA es pública: carta-
-- oferta.html no tiene login (el cliente la llena solo con el link), así
-- que el desplegable de borradores tiene que poder leerse sin sesión. Solo
-- la escritura (crear/borrar borradores) queda restringida a Walter, desde
-- el panel.
-- ============================================================

create table oferta_borradores (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    rental_term text,
    owner_conditions text,
    payment_method text,
    payment_details text,
    notas_adicionales text,
    created_at timestamptz not null default now()
);

create index oferta_borradores_created_at_idx on oferta_borradores(created_at desc);

alter table oferta_borradores enable row level security;

create policy "cualquiera lee borradores de oferta" on oferta_borradores
    for select to anon, authenticated using (true);
create policy "autenticados crean borradores de oferta" on oferta_borradores
    for insert to authenticated with check (true);
create policy "autenticados eliminan borradores de oferta" on oferta_borradores
    for delete to authenticated using (true);
