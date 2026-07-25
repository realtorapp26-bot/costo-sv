-- Faltaba: los usuarios logueados (panel interno) también pueden crear
-- contactos/leads/actividades a mano, no solo los formularios públicos (anon).

create policy "autenticados crean contactos" on contactos
    for insert to authenticated with check (true);

create policy "autenticados crean leads" on leads
    for insert to authenticated with check (true);

create policy "autenticados crean actividades" on actividades
    for insert to authenticated with check (true);
