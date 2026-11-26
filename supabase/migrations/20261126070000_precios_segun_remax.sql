-- Precios alineados con la ficha oficial de RE/MAX (campo "Price").
--
-- Walter confirmó el 2026-11-25: el terreno de 419.34 m² de Golden Lake se
-- queda en $125,000 (su precio es el correcto, no el de RE/MAX), y los otros
-- cinco se cambian al de RE/MAX.
--
-- El "and precio = ..." es a propósito: si Walter ya cambió alguno a mano
-- desde el panel, esa línea no lo pisa.

-- Casa en el corazón de Concepción de Ataco: $625,000 -> $590,000
update propiedades set precio = '$590,000'
 where slug = 'beautiful-house-for-sale-in-the-heart-of-ataco'
   and precio = '$625,000';

-- Terreno en Residencial Atami, Surf City: $137,000 -> $140,000
update propiedades set precio = '$140,000'
 where slug = 'terreno-de-1-483-v-en-residencial-atami-surf-city'
   and precio = '$137,000';

-- Bodega en el Centro Histórico: $6,000 -> $5,000
update propiedades set precio = '$5,000'
 where slug = 'bodega-en-el-centro-historico'
   and precio = '$6,000.00';

-- Casa nueva en alquiler, Villa San Carlos: $1,400 -> $1,300 al mes
update propiedades set precio = '$1,300'
 where slug = 'brand-new-house-for-rent-in-villa-san-carlos-escal'
   and precio = '$1,400';

-- Local comercial en alquiler, Edificio Letona: $2,700 -> $2,610 al mes
update propiedades set precio = '$2,610'
 where slug = 'commercial-space-in-letona-building'
   and precio = '$2,700.00';
