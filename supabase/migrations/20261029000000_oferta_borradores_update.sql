-- ============================================================
-- Costo SV — Permitir editar los borradores de carta de oferta
-- La tabla se creó con políticas de lectura (pública), inserción y
-- borrado, pero sin UPDATE. Sin esta política, editar un borrador desde
-- el panel no da error: PostgREST devuelve 204 y no cambia ninguna fila
-- (RLS la filtra en silencio). Hacía falta para poder completar un
-- borrador ya creado —como el del Beach Ranch— sin borrarlo y volver a
-- cargar los nueve bienes a mano.
-- ============================================================

create policy "autenticados editan borradores de oferta" on oferta_borradores
    for update to authenticated using (true) with check (true);

-- Verificación: deben aparecer cuatro políticas (select, insert, update, delete).
select policyname, cmd
  from pg_policies
 where tablename = 'oferta_borradores'
 order by cmd;
