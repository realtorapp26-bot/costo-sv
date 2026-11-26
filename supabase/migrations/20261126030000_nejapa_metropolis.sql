-- Casa en alquiler en Nejapa ($890/mes): la urbanización se llama
-- "Metrópolis San Gabriel" (confirmado por Walter). El título ya lo decía
-- bien; el campo de ubicación decía "Metrópoli", sin la s.

update propiedades
   set ubicacion = 'Urbanización Metrópolis San Gabriel, Nejapa, San Salvador'
 where slug = 'casa-en-alquiler-en-metropolis-san-gabriel-nejapa';
