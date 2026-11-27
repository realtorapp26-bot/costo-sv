-- Impide que la misma propiedad de RE/MAX quede publicada dos veces.
--
-- Pasó el 2026-11-27: el terreno de Lourdes-Colón se subió a las 15:11 y otra
-- vez a las 16:05 (mismo id_externo 002522473070), porque la portada mostraba
-- solo 3 tarjetas y la nueva no aparecía, así que Walter la volvió a subir.
-- El importador de LOTE ya salteaba los repetidos, pero el de UNA SOLA
-- propiedad no revisaba nada.
--
-- El índice es PARCIAL a propósito: solo mira las publicadas. Así una copia
-- oculta puede seguir guardada (no se pierde nada), y si Walter oculta una y
-- vuelve a subir la misma, el sistema lo deja.

-- Primero hay que ocultar la copia que sobra, si no el índice no se puede
-- crear. Walter eligió quedarse con la de las 16:05.
update propiedades
   set publicada = false
 where slug = 'long-term-land-for-lease-in-lourdes-colon';

-- La que queda se lleva las medidas que traía la otra (20 m de frente x 94 m
-- de fondo): es la misma propiedad, y ese dato le sirve al cliente.
update propiedades
   set tamano_lote = '1,880 m² (20 m × 94 m)'
 where slug = 'long-term-land-for-lease-in-lourdes-colon-1';

create unique index if not exists propiedades_id_externo_publicada_idx
    on propiedades (id_externo)
 where id_externo is not null and publicada;

comment on index propiedades_id_externo_publicada_idx is
    'Dos propiedades publicadas no pueden compartir el id de RE/MAX. Es parcial (solo publicadas) para que las copias ocultas sigan guardadas.';
