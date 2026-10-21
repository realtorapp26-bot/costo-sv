-- ============================================================
-- Costo SV — Borradores de contrato de comercialización
-- Plantillas reusables: Walter guarda cualquier contrato que llena como
-- borrador (nombre + los campos del trato, sin fechas ni firma -- esas
-- siempre se vuelven a poner frescas en cada contrato nuevo) y lo puede
-- volver a usar para precargar el formulario "Nuevo contrato".
-- ============================================================

create table contrato_borradores (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    campos jsonb not null,
    created_at timestamptz not null default now()
);

create index contrato_borradores_created_at_idx on contrato_borradores(created_at desc);

alter table contrato_borradores enable row level security;

create policy "autenticados leen borradores" on contrato_borradores
    for select to authenticated using (true);
create policy "autenticados crean borradores" on contrato_borradores
    for insert to authenticated with check (true);
create policy "autenticados eliminan borradores" on contrato_borradores
    for delete to authenticated using (true);

-- Borrador inicial: el contrato de ejemplo que mandó Walter (Beach Ranch,
-- David Bamford), listo para usarse como plantilla.
insert into contrato_borradores (nombre, campos) values (
  'Beach Ranch - David Bamford',
  '{
    "vendedor_nombre": "David Bamford (100% ownership)",
    "corredor_nombre": "Oana Guerrero",
    "propiedad_descripcion": "Beach ranch, rustic land, 540.64 m2 (N 26.61 m, S 25.10 m, W 21.91 m, E 20.14 m)",
    "propiedad_registro": "Matricula 55102488-00000 (Folio Activo)",
    "propiedad_direccion": "Canton El Zapote, Playas de Jaltepeque, San Luis La Herradura, La Paz",
    "propiedad_gravamenes": "None (no liens, restrictions, alerts or pending filings)",
    "propiedad_certificado": "CNR Certificacion Extractada, request 08202600020301, dated 18/10/2026",
    "precio_lista": 365000,
    "tipo_listado": "no_exclusivo",
    "comision_porcentaje": 5,
    "comision_incluye_iva": true,
    "plazo_meses": 6,
    "periodo_proteccion_dias": 180,
    "notas": null,
    "inventario": [
      {"item":"Furniture","descripcion":"All furniture in the house","cantidad":""},
      {"item":"Beds","descripcion":"All beds, including frames and mattresses","cantidad":""},
      {"item":"Air conditioning units","descripcion":"All installed A/C units","cantidad":""},
      {"item":"Televisions","descripcion":"All TVs in the house","cantidad":""},
      {"item":"Kitchen items","descripcion":"All appliances, cookware, dishes and utensils","cantidad":""},
      {"item":"Washer and dryer","descripcion":"Washer and dryer","cantidad":""},
      {"item":"Starlink","descripcion":"Starlink satellite internet kit (dish and router)","cantidad":""},
      {"item":"Tools and equipment","descripcion":"All tools and equipment in the storage area","cantidad":""},
      {"item":"Agricultural equip. & supplies","descripcion":"All agricultural equipment and supplies on the property","cantidad":""}
    ]
  }'::jsonb
);
