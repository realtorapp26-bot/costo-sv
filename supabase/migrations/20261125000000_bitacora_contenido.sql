-- ============================================================
--  Bitácora de contenido del sitio
--
--  Para poder avisar cada día "esto se publicó, esto se borró" hace falta
--  guardar el hecho EN EL MOMENTO en que pasa: el panel borra con un DELETE
--  real (propiedades-admin.html → eliminar/eliminarSeleccionadas), así que
--  una vez borrada la fila no queda forma de saber que existió. Lo mismo con
--  despublicar: solo queda el estado nuevo, no el cambio.
--
--  Por eso la bitácora se llena con un trigger en la base y no desde el
--  frontend: así registra igual si el cambio se hizo desde el panel clásico,
--  desde el panel nuevo, desde el SQL Editor o desde una función serverless.
--  Si mañana se agrega otro panel, sigue funcionando sin tocar nada.
--
--  No guarda datos personales: solo tabla, id, acción y el título público.
-- ============================================================

create table if not exists bitacora_contenido (
    id uuid primary key default gen_random_uuid(),
    tabla text not null,
    registro_id text,
    accion text not null check (accion in (
        'publicado', 'despublicado', 'creado_oculto', 'editado', 'borrado'
    )),
    titulo text,
    slug text,
    created_at timestamptz not null default now()
);

create index if not exists bitacora_contenido_created_at_idx
    on bitacora_contenido(created_at desc);
create index if not exists bitacora_contenido_accion_idx
    on bitacora_contenido(accion);

alter table bitacora_contenido enable row level security;

-- Solo el panel (usuario logueado) la lee. El resumen diario la lee con
-- service_role, que no pasa por RLS. El sitio público no la toca nunca.
drop policy if exists "autenticados leen la bitacora" on bitacora_contenido;
create policy "autenticados leen la bitacora" on bitacora_contenido
    for select to authenticated using (true);

-- Nadie escribe a mano: solo el trigger, que corre como dueño de la tabla.

-- ------------------------------------------------------------
--  El trigger es uno solo para las cuatro tablas de contenido, que tienen
--  columnas distintas para lo mismo (titulo/nombre/nombre_cliente,
--  publicada/publicado). Se resuelve leyendo la fila como jsonb en vez de
--  escribir una función por tabla.
-- ------------------------------------------------------------
create or replace function registrar_bitacora_contenido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    fila       jsonb;
    previa     jsonb;
    pub_antes  boolean;
    pub_ahora  boolean;
    accion_reg text;
    nombre_reg text;
begin
    if tg_op = 'DELETE' then
        fila := to_jsonb(old);
    else
        fila := to_jsonb(new);
    end if;

    nombre_reg := coalesce(fila->>'titulo', fila->>'nombre', fila->>'nombre_cliente', 'sin título');
    pub_ahora  := coalesce((fila->>'publicada')::boolean, (fila->>'publicado')::boolean, true);

    if tg_op = 'INSERT' then
        accion_reg := case when pub_ahora then 'publicado' else 'creado_oculto' end;

    elsif tg_op = 'DELETE' then
        accion_reg := 'borrado';

    else
        previa    := to_jsonb(old);
        pub_antes := coalesce((previa->>'publicada')::boolean, (previa->>'publicado')::boolean, true);

        if pub_antes is distinct from pub_ahora then
            accion_reg := case when pub_ahora then 'publicado' else 'despublicado' end;

        -- Arrastrar propiedades para reordenarlas hace un PATCH de "orden" en
        -- varias filas de una sola vez (propiedades-admin.html → soltarArrastre).
        -- Eso no es un cambio de contenido y llenaría la bitácora de ruido, así
        -- que "orden" y "updated_at" se descartan antes de comparar.
        elsif (fila - 'orden' - 'updated_at') is distinct from (previa - 'orden' - 'updated_at') then
            accion_reg := 'editado';

        else
            return new;
        end if;
    end if;

    insert into bitacora_contenido (tabla, registro_id, accion, titulo, slug)
    values (tg_table_name, fila->>'id', accion_reg, left(nombre_reg, 160), fila->>'slug');

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_bitacora_propiedades on propiedades;
create trigger trg_bitacora_propiedades
    after insert or update or delete on propiedades
    for each row execute function registrar_bitacora_contenido();

drop trigger if exists trg_bitacora_franquicias on franquicias;
create trigger trg_bitacora_franquicias
    after insert or update or delete on franquicias
    for each row execute function registrar_bitacora_contenido();

drop trigger if exists trg_bitacora_testimonios on testimonios;
create trigger trg_bitacora_testimonios
    after insert or update or delete on testimonios
    for each row execute function registrar_bitacora_contenido();

drop trigger if exists trg_bitacora_proyectos on proyectos;
create trigger trg_bitacora_proyectos
    after insert or update or delete on proyectos
    for each row execute function registrar_bitacora_contenido();
