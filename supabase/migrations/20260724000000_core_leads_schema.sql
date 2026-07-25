-- Esquema mínimo de leads para Costo SV.
-- Nombrado como el futuro núcleo (contactos/leads/actividades) para que migrar
-- a Atlas Core más adelante sea mover datos, no reescribir código.

create extension if not exists "pgcrypto";

create table contactos (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    telefono text,
    correo text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table leads (
    id uuid primary key default gen_random_uuid(),
    contacto_id uuid not null references contactos(id) on delete cascade,
    origen text not null check (origen in ('whatsapp', 'formulario_web', 'marketplace', 'referido', 'otro')),
    interes text not null check (interes in ('comprar', 'vender', 'invertir', 'otro')),
    propiedad_referencia text,
    estado text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'calificado', 'perdido', 'cerrado')),
    notas text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table actividades (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references leads(id) on delete cascade,
    tipo text not null check (tipo in ('llamada', 'whatsapp', 'nota', 'cita', 'correo', 'otro')),
    detalle text,
    created_at timestamptz not null default now()
);

create index leads_contacto_id_idx on leads(contacto_id);
create index leads_estado_idx on leads(estado);
create index leads_created_at_idx on leads(created_at desc);
create index actividades_lead_id_idx on actividades(lead_id);

alter table contactos enable row level security;
alter table leads enable row level security;
alter table actividades enable row level security;

-- Los formularios públicos del sitio (clave anon) solo pueden INSERTAR,
-- nunca leer ni modificar leads existentes.
create policy "anon puede crear contactos" on contactos
    for insert to anon with check (true);

create policy "anon puede crear leads" on leads
    for insert to anon with check (true);

create policy "anon puede crear actividades" on actividades
    for insert to anon with check (true);

-- Lectura/edición (para el panel admin) queda restringida a usuarios
-- autenticados; se define el login (vos + tu esposa) en la etapa del panel.
create policy "autenticados leen contactos" on contactos
    for select to authenticated using (true);

create policy "autenticados editan contactos" on contactos
    for update to authenticated using (true);

create policy "autenticados leen leads" on leads
    for select to authenticated using (true);

create policy "autenticados editan leads" on leads
    for update to authenticated using (true);

create policy "autenticados leen actividades" on actividades
    for select to authenticated using (true);
