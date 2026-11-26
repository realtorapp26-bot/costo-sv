-- Contador de días seguidos que una propiedad lleva sin responder, para que
-- el chequeo diario (api/chequear-disponibilidad.js) pueda ocultarla sola
-- recién al tercer día y no al primero: así un corte de red de un día no baja
-- una propiedad que está bien.
--
-- En cuanto la propiedad vuelve a responder el contador se pone en cero, y
-- cuando se oculta también (si Walter la vuelve a publicar, arranca de nuevo
-- con los tres días completos).

alter table propiedades
    add column if not exists dias_sin_responder integer not null default 0;

comment on column propiedades.dias_sin_responder is
    'Días seguidos que el chequeo diario la encontró sin responder. Al llegar a 3 se oculta sola (publicada = false) y vuelve a 0. Cualquier chequeo exitoso la devuelve a 0.';
