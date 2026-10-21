-- ============================================================
-- Costo SV — Borradores de Carta de Respuesta
-- Mismo criterio que oferta_borradores: lectura pública (sin login, porque
-- el propietario llena carta-respuesta.html solo con el link), escritura
-- restringida a Walter desde el panel.
-- ============================================================

create table respuesta_borradores (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    payment_method text,
    payment_details text,
    rental_term text,
    additional_terms text,
    notas_adicionales text,
    created_at timestamptz not null default now()
);

create index respuesta_borradores_created_at_idx on respuesta_borradores(created_at desc);

alter table respuesta_borradores enable row level security;

create policy "cualquiera lee borradores de respuesta" on respuesta_borradores
    for select to anon, authenticated using (true);
create policy "autenticados crean borradores de respuesta" on respuesta_borradores
    for insert to authenticated with check (true);
create policy "autenticados eliminan borradores de respuesta" on respuesta_borradores
    for delete to authenticated using (true);
