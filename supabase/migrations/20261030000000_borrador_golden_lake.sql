-- ============================================================
-- Costo SV — Borrador de carta de oferta para Golden Lake
-- Dos cosas:
--  1. "titulo_inventario": el listado de la carta siempre se titulaba
--     "Bienes incluidos". Para un proyecto hace falta otro título
--     ("Lo que incluye Golden Lake"), porque lo que se lista no son
--     muebles sino las generalidades del desarrollo.
--  2. El borrador de Golden Lake con las generalidades reales del
--     proyecto, tomadas de la ficha publicada en golden-lake.html y del
--     plano interactivo (plano-golden-lake.js).
-- ============================================================

alter table oferta_borradores add column if not exists titulo_inventario text;

insert into oferta_borradores (
    nombre, tipo_oferta, ciudad_emision,
    propiedad_municipio, propiedad_departamento, propiedad_direccion,
    precio_lista, payment_method, payment_details,
    titulo_inventario, notas_adicionales, inventario
) values (
    'Golden Lake - Casa nueva (Clovis Closa)',
    'VENTA',
    'San Salvador',
    'San Luis La Herradura',
    'La Paz',
    'Residencial Golden Lake, Bulevar Costa del Sol — Polígono 7, Lote 5',
    400000,
    'Mixto',
    'Reserva con el 30% de prima al firmar la promesa de venta y el saldo contra la entrega de la vivienda, prevista para diciembre de 2026.',
    'Lo que incluye Golden Lake / What Golden Lake includes',
    'Promoción en planos. La entrega de la vivienda está prevista para diciembre de 2026.',
    '[
      {"item":"Residencial privado con acceso controlado y vigilancia sobre el Bulevar Costa del Sol","descripcion":"","cantidad":""},
      {"item":"Tres lagunas privadas integradas al diseño del residencial","descripcion":"","cantidad":""},
      {"item":"Muelle privado con acceso al estero de Jaltepeque","descripcion":"","cantidad":""},
      {"item":"Cancha de tenis de uso de los propietarios","descripcion":"","cantidad":""},
      {"item":"Club social del residencial","descripcion":"","cantidad":""},
      {"item":"Membresía VIP a Tesoro Beach incluida con la compra, sin entrada aparte","descripcion":"","cantidad":""},
      {"item":"Casa nueva de dos niveles: 5 habitaciones, 6 baños y 4 terrazas","descripcion":"","cantidad":""},
      {"item":"Terreno de 300 m² (10 x 30 m) con título propio","descripcion":"","cantidad":""},
      {"item":"Parqueo para 3 vehículos, uno de ellos techado","descripcion":"","cantidad":""},
      {"item":"Sala, comedor y cocina en concepto abierto, con sala de doble altura","descripcion":"","cantidad":""},
      {"item":"Cocina con isla central en cuarzo blanco","descripcion":"","cantidad":""},
      {"item":"Piso de porcelanato antideslizante en todo el primer nivel","descripcion":"","cantidad":""},
      {"item":"Piscina con deck de revestimiento WPC apariencia de madera","descripcion":"","cantidad":""},
      {"item":"Terraza cubierta a lo largo de toda la fachada","descripcion":"","cantidad":""},
      {"item":"Habitación principal con vista a la piscina, terraza propia y balcón independiente","descripcion":"","cantidad":""},
      {"item":"Casa amueblada, con línea blanca incluida","descripcion":"","cantidad":""},
      {"item":"Comedor y cocina amueblados","descripcion":"","cantidad":""},
      {"item":"Aire acondicionado tipo cassette en áreas sociales","descripcion":"","cantidad":""},
      {"item":"Aire acondicionado en todas las habitaciones","descripcion":"","cantidad":""},
      {"item":"Agua caliente","descripcion":"","cantidad":""}
    ]'::jsonb
);

-- Verificación: debe devolver el borrador con sus 20 puntos.
select nombre, titulo_inventario, jsonb_array_length(inventario) as puntos
  from oferta_borradores
 where nombre like 'Golden Lake%';
