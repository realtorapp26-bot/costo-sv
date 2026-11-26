-- Revisión de disponibilidad de las 56 publicaciones (2026-11-25).
--
-- "Casa de dos niveles en Jardines de Merliot, Santa Tecla" ($360,000):
-- su ficha de RE/MAX Connect ya no existe. El link
--   https://share.remax-ccamls.com/show/3093/003384842007
-- redirige a la raíz del sitio (302 -> "/") en 5 de 5 intentos, que es la
-- señal de "ficha dada de baja" documentada en api/chequear-disponibilidad.js.
-- Sus fotos siguen vivas (están en remaxcentrum.com, otra oficina), así que
-- la señal de respaldo no la salva: lo que se cayó es la publicación.
--
-- Se oculta, no se borra: queda en el panel y basta poner publicada = true
-- para volverla a mostrar si vuelve a estar disponible.

update propiedades
   set publicada = false
 where slug = 'casa-de-dos-niveles-en-jardines-de-merliot-santa-t';
