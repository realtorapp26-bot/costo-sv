-- ============================================================
-- Costo SV — Lista de bienes incluidos (checklist) en Carta de Oferta
-- Igual que en contrato_borradores: cada borrador puede traer una lista de
-- bienes (item/descripción/cantidad). carta-oferta.html la muestra como
-- checkboxes marcados por default -- el cliente puede desmarcar lo que no
-- quiera incluir en su oferta antes de generar el PDF.
-- ============================================================

alter table oferta_borradores add column if not exists inventario jsonb not null default '[]';

-- Borrador para la oferta de Michael sobre el Beach Ranch de David Bamford,
-- con el mismo listado de bienes ya autorizado en el contrato de
-- comercialización firmado (precio de lista US$365,000).
insert into oferta_borradores (nombre, inventario) values (
  'Beach Ranch - David Bamford',
  '[
    {"item":"Furniture","descripcion":"All furniture in the house","cantidad":""},
    {"item":"Beds","descripcion":"All beds, including frames and mattresses","cantidad":""},
    {"item":"Air conditioning units","descripcion":"All installed A/C units","cantidad":""},
    {"item":"Televisions","descripcion":"All TVs in the house","cantidad":""},
    {"item":"Kitchen items","descripcion":"All appliances, cookware, dishes and utensils","cantidad":""},
    {"item":"Washer and dryer","descripcion":"Washer and dryer","cantidad":""},
    {"item":"Starlink","descripcion":"Starlink satellite internet kit (dish and router)","cantidad":""},
    {"item":"Tools and equipment","descripcion":"All tools and equipment in the storage area","cantidad":""},
    {"item":"Agricultural equip. & supplies","descripcion":"All agricultural equipment and supplies on the property","cantidad":""}
  ]'::jsonb
);
