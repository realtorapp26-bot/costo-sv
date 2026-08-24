-- Franquicias en venta (alianza con Retail Solutions y futuros aliados).
-- Mismo patrón que "propiedades": lectura pública solo de lo publicado,
-- alta/edición/borrado restringido a usuarios autenticados (panel interno).

create table franquicias (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    aliado text not null default 'Retail Solutions',
    categoria text not null check (categoria in (
        'Alimentos y Bebidas', 'Retail y Moda', 'Servicios', 'Salud y Belleza',
        'Educación', 'Entretenimiento', 'Otro'
    )),
    descripcion_original text,
    copy_venta text,
    inversion_total text,
    cuota_franquicia text,
    regalias text,
    retorno_estimado text,
    espacio_requerido text,
    empleados_requeridos text,
    unidades_actuales text,
    anos_en_mercado text,
    territorios_disponibles text,
    beneficios text[] not null default '{}',
    fotos text[] not null default '{}',
    link_referencia text,
    publicada boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index franquicias_categoria_idx on franquicias(categoria);
create index franquicias_publicada_idx on franquicias(publicada);
create index franquicias_created_at_idx on franquicias(created_at desc);

alter table franquicias enable row level security;

create policy "publico lee franquicias publicadas" on franquicias
    for select to anon using (publicada = true);

create policy "autenticados leen todas las franquicias" on franquicias
    for select to authenticated using (true);

create policy "autenticados crean franquicias" on franquicias
    for insert to authenticated with check (true);

create policy "autenticados editan franquicias" on franquicias
    for update to authenticated using (true);

create policy "autenticados eliminan franquicias" on franquicias
    for delete to authenticated using (true);
