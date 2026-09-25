-- Proyectos/desarrollos (ej. Golden Lake): páginas propias que agrupan varias
-- propiedades de un mismo residencial, con su propia historia de venta, fotos
-- del desarrollo en general y video. Mismo patrón que "propiedades"/"testimonios":
-- lectura pública solo de lo publicado, alta/edición/borrado desde el panel.

create table proyectos (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    nombre text not null,
    descripcion text,
    ubicacion text,
    amenidades text[] not null default '{}',
    fotos text[] not null default '{}',
    video_url text,
    latitud numeric,
    longitud numeric,
    publicado boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index proyectos_slug_idx on proyectos(slug);
create index proyectos_publicado_idx on proyectos(publicado);

alter table proyectos enable row level security;

create policy "publico lee proyectos publicados" on proyectos
    for select to anon using (publicado = true);

create policy "autenticados leen todos los proyectos" on proyectos
    for select to authenticated using (true);

create policy "autenticados crean proyectos" on proyectos
    for insert to authenticated with check (true);

create policy "autenticados editan proyectos" on proyectos
    for update to authenticated using (true);

create policy "autenticados eliminan proyectos" on proyectos
    for delete to authenticated using (true);
