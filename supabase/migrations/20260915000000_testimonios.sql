-- Testimonios de clientes, para mostrar prueba social en el sitio público.
-- Mismo patrón que "propiedades"/"franquicias": lectura pública solo de lo
-- publicado, alta/edición/borrado restringido a usuarios autenticados (panel).

create table testimonios (
    id uuid primary key default gen_random_uuid(),
    nombre_cliente text not null,
    texto text not null,
    calificacion int not null default 5 check (calificacion between 1 and 5),
    propiedad_relacionada text,
    foto_cliente text,
    publicado boolean not null default true,
    orden integer,
    created_at timestamptz not null default now()
);

create index testimonios_publicado_idx on testimonios(publicado);
create index testimonios_created_at_idx on testimonios(created_at desc);

alter table testimonios enable row level security;

create policy "publico lee testimonios publicados" on testimonios
    for select to anon using (publicado = true);

create policy "autenticados leen todos los testimonios" on testimonios
    for select to authenticated using (true);

create policy "autenticados crean testimonios" on testimonios
    for insert to authenticated with check (true);

create policy "autenticados editan testimonios" on testimonios
    for update to authenticated using (true);

create policy "autenticados eliminan testimonios" on testimonios
    for delete to authenticated using (true);
