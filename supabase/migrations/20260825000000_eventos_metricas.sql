-- Métricas propias del sitio (pageviews, clics de WhatsApp, fichas vistas,
-- dossiers descargados, formularios enviados), para verlas en el panel.
-- No guarda ningún dato personal del visitante.

create table eventos (
    id uuid primary key default gen_random_uuid(),
    tipo text not null check (tipo in ('pageview', 'whatsapp_click', 'lead_submit', 'ficha_view', 'dossier_download')),
    pagina text,
    detalle text,
    created_at timestamptz not null default now()
);

create index eventos_tipo_idx on eventos(tipo);
create index eventos_created_at_idx on eventos(created_at desc);

alter table eventos enable row level security;

-- El panel (usuario logueado) los lee para mostrar las métricas.
create policy "autenticados leen eventos" on eventos
    for select to authenticated using (true);

-- El sitio público NO tiene INSERT directo a la tabla: registra eventos vía
-- esta función (RPC), más angosta y segura que exponer la tabla completa.
-- (Se intentó primero con una policy "insert to anon" directa; por una causa
-- de caché/gateway en Supabase que no cedió ni con reload de schema ni con
-- reinicio del proyecto, se resolvió moviendo el insert a este RPC.)
create or replace function registrar_evento_publico(p_tipo text, p_pagina text, p_detalle text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into eventos (tipo, pagina, detalle) values (p_tipo, p_pagina, p_detalle);
end;
$$;

revoke all on function registrar_evento_publico(text, text, text) from public;
grant execute on function registrar_evento_publico(text, text, text) to anon;
