-- Terreno de 500 v² en Residencial Golden Lake, Costa del Sol ($100,000).
--
-- El campo de construcción decía "500 m²" en un terreno baldío: son los
-- 500 varas² copiados con la unidad equivocada. El anuncio original de
-- RE/MAX (share.remax-ccamls.com/show/3093/003094864001) dice:
--     "Área del terreno: 500 v² | 349.50 m²
--      15.00 m de frente x 23.30 m de fondo"
-- y 15.00 × 23.30 = 349.50 m², así que 349.50 m² es la medida correcta.
--
-- Se borra la construcción inventada y se guarda el equivalente en m²,
-- que es lo que el sitio muestra en la tarjeta.

update propiedades
   set tamano_construccion = null,
       m2 = '349.50'
 where slug = 'terreno-de-500-v-en-residencial-golden-lake-costa'
   and tamano_construccion = '500 m²';
