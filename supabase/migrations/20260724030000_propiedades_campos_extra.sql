-- Campos adicionales detectados en listados reales de RE/MAX (sin datos de agente/oficina,
-- ese dato queda deliberadamente fuera para que el sitio muestre todo bajo una sola marca).

alter table propiedades
    add column tipo_contrato text not null default 'venta' check (tipo_contrato in ('venta', 'alquiler')),
    add column tipo_propiedad_detalle text,
    add column tamano_lote text,
    add column tamano_construccion text,
    add column id_externo text,
    add column latitud numeric,
    add column longitud numeric,
    add column garage boolean,
    add column hoa boolean,
    add column comunidad_cerrada boolean,
    add column propiedad_nueva boolean,
    add column tour_virtual_url text,
    add column video_url text;

create index propiedades_id_externo_idx on propiedades(id_externo);
create index propiedades_tipo_contrato_idx on propiedades(tipo_contrato);
