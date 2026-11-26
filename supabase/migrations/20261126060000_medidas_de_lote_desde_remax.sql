-- Medidas de lote tomadas del campo oficial "Lot size" de la ficha de RE/MAX
-- (share.remax-ccamls.com, que abre sin login), NO del texto descriptivo:
-- ahí es donde están los errores de conversión.
--
-- Los precios que no coinciden con RE/MAX no se tocan acá a propósito: esos
-- los decide Walter, porque puede haber acordado otro precio con el dueño.
--
-- Factor usado: 1 vara = 0.8359 m, así que 1 v² = 0.698737 m².


-- ============================================================
-- A) Cinco medidas que estaban CORTADAS en la coma de los miles
--    (un terreno de 1,157.51 m² se publicaba como "1 m²").
-- ============================================================

-- Terreno en Brisas de Las Mercedes, Zaragoza — publicaba "1 m²"
update propiedades set tamano_lote = '1,157.51 m²', m2 = '1,157.51'
 where slug = 'terreno-en-venta-en-brisas-de-las-mercedes-zaragoz';

-- Residencial Atami, Surf City — publicaba "1 m²" (el título ya decía 1,483 v²,
-- que son justo 1,036 m²: la medida del título estaba bien)
update propiedades set tamano_lote = '1,036 m² (1,483 v²)', m2 = '1,036'
 where slug = 'terreno-de-1-483-v-en-residencial-atami-surf-city';

-- Las Luces, camino a Surf City — publicaba "1 Vr2"
update propiedades set tamano_lote = '1,631 v²', m2 = '1,139.64'
 where slug = 'terreno-en-venta-en-las-luces-camino-a-surf-city';

-- Finca de café, El Durazno — publicaba "114 m²" (16.37 manzanas del título
-- son 114,409 m², así que cuadra con los 114,400 de RE/MAX)
update propiedades set tamano_lote = '114,400 m²', m2 = '114,400'
 where slug = 'coffee-farm-for-sale-with-ocean-views-in-acajutla';

-- Terreno en Apaneca — publicaba "10 m²" (1.5 manzanas son 10,483 m²)
update propiedades set tamano_lote = '10,500 m²', m2 = '10,500'
 where slug = 'for-sale-1-5-mz-of-land-in-apaneca-with-a-view-tow';


-- ============================================================
-- B) La finca cafetalera: el número estaba bien, la unidad no.
--    RE/MAX dice "Lot size: 960,000.00 Sq. Vr." -> son 960,000 VARAS²,
--    no metros. 96 manzanas x 10,000 v² = 960,000 v² exacto, y eso da
--    670,787 m² (67 hectáreas), que es justo lo que dice su descripción:
--    "96 manzanas (approximately 165 acres / 67 hectares)".
--    En la base los 960,000 estaban guardados en el campo de metros.
-- ============================================================

update propiedades set tamano_lote = '96 manzanas (960,000 v²)', m2 = '670,787'
 where slug = 'finca-cafetalera-y-ganadera-en-venta-guayaltepe-ah';


-- ============================================================
-- C) Ocho que tenían el campo del lote vacío y RE/MAX sí lo tiene.
--    El campo m² solo se llena si estaba vacío, para no pisar un dato
--    que alguien haya puesto a mano.
-- ============================================================

update propiedades set tamano_lote = '291.05 m²', m2 = coalesce(m2, '291.05')
 where slug = 'condado-santa-rosa-santa-tecla-spacious-remodeled';

update propiedades set tamano_lote = '3,850 m²', m2 = coalesce(m2, '3,850')
 where slug = 'closed-door-beach-club-for-sale-in-playa-maculis-l';

update propiedades set tamano_lote = '67.10 m²', m2 = coalesce(m2, '67.10')
 where slug = 'commercial-space-for-sale-in-gzg-condominio-san-sa';

update propiedades set tamano_lote = '85 m²', m2 = coalesce(m2, '85')
 where slug = 'commercial-space-in-letona-building';

update propiedades set tamano_lote = '114 m²', m2 = coalesce(m2, '114')
 where slug = 'house-for-sale-ciudad-marsella-cluster-3';

update propiedades set tamano_lote = '414.50 m²', m2 = coalesce(m2, '414.50')
 where slug = 'cabin-in-apaneca-ruta-de-las-flores';

update propiedades set tamano_lote = '223.43 m²', m2 = coalesce(m2, '223.43')
 where slug = 'casa-en-alquiler-en-metropolis-san-gabriel-nejapa';

update propiedades set tamano_lote = '4,800 v²', m2 = coalesce(m2, '3,353.94')
 where slug = 'terreno-residencial-ahuachapan';
