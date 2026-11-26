// ============================================================
//  Costo SV — Chequeo diario de propiedades que podrían haberse caído
//
//  Disparado por Vercel Cron (ver vercel.json). Para cada propiedad
//  publicada, revisa si su link de RE/MAX Connect (link_referencia) y/o
//  su foto principal siguen respondiendo.
//
//  Qué hace cuando algo no responde (decidido con Walter el 2026-11-25):
//  cuenta los días SEGUIDOS que lleva sin responder en
//  propiedades.dias_sin_responder, y al tercero la oculta sola
//  (publicada = false). En cuanto vuelve a responder, el contador se pone
//  en cero. No se borra nada nunca: ocultar es reversible con un clic.
//  Antes solo avisaba; se pasó a ocultar porque una ficha dada de baja en
//  RE/MAX puede quedar días en el sitio si el aviso se pasa por alto.
//  El umbral de tres días es lo que evita que un corte de red de un día
//  baje una propiedad que está perfectamente bien.
//
//  Por qué estas dos señales:
//  - El link de la ficha individual (share.remax-ccamls.com/show/...) SÍ
//    se puede revisar desde el servidor sin bloqueo (confirmado). El sitio
//    público de búsqueda (remax-centralamerica.com) si está bloqueado para
//    fetch de servidor, así que esos link_referencia no se revisan directo.
//  - La foto principal vive en un CDN aparte (Azure) que tampoco está
//    bloqueado, así que sirve de señal de respaldo para esos casos (y
//    como segunda confirmación en general).
// ============================================================

import { enviarResumen } from '../lib/resumenDiario.js';

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const SITE_URL = 'https://guerrero-properties.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const HOST_CHEQUEABLE = /(^|\.)remax-ccamls\.com$/i;
const TIMEOUT_MS = 8000;
const CAMPOS = 'id,titulo,slug,link_referencia,fotos';

// Días seguidos sin responder antes de ocultar la propiedad. Tres y no uno
// porque el chequeo corre una vez al día: con uno, un corte de red o un rato
// de mantenimiento del CDN bastaría para bajar una propiedad que está bien.
const DIAS_PARA_OCULTAR = 3;

async function vivo(url) {
  const controlador = new AbortController();
  const corte = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controlador.signal, redirect: 'follow' });
    return r.ok;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(corte);
  }
}

// Para el link de la ficha: NO conviene seguir redirecciones. Una ficha
// activa responde 200 directo; una ficha dada de baja redirige a la raíz
// del sitio (share.remax-ccamls.com/), que a su vez rebota al sitio
// bloqueado (remax-centralamerica.com) y choca con su desafío de
// Cloudflare -- si se sigue esa redirección se mezcla "ficha dada de baja"
// con "el sitio público está bloqueado", que son cosas distintas. Se
// revisa solo el primer salto: 200 = viva, redirección a "/" (o vacío) =
// de baja, cualquier otra cosa = no concluyente (no se marca sospechosa,
// para no generar falsas alarmas).
async function linkDeFichaVivo(url) {
  const controlador = new AbortController();
  const corte = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controlador.signal, redirect: 'manual' });
    if (r.status === 200) return true;
    if (r.status >= 300 && r.status < 400) {
      const destino = (r.headers.get('location') || '').trim();
      if (destino === '/' || destino === '') return false;
      return null;
    }
    return null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(corte);
  }
}

async function chequearPropiedad(p) {
  let linkChequeable = false;
  let linkVivo = null;
  if (p.link_referencia) {
    try {
      const host = new URL(p.link_referencia).hostname;
      if (HOST_CHEQUEABLE.test(host)) {
        linkChequeable = true;
        linkVivo = await linkDeFichaVivo(p.link_referencia);
      }
    } catch (e) { /* link mal formado -- se ignora, no es chequeable */ }
  }

  let fotoVivo = null;
  const foto0 = (p.fotos && p.fotos[0]) || null;
  if (foto0) fotoVivo = await vivo(foto0);

  let sospechosa = false;
  let motivo = null;
  if (linkChequeable && linkVivo === false) {
    sospechosa = true;
    motivo = 'El link de RE/MAX Connect ya no responde';
  } else if (!linkChequeable && foto0 && fotoVivo === false) {
    sospechosa = true;
    motivo = 'La foto principal ya no carga';
  }

  return { ...p, linkChequeable, linkVivo, fotoVivo, sospechosa, motivo };
}

// Escribe en la propiedad. Si falla no se corta el chequeo de las demás: se
// deja el error en el log y esa propiedad se trata como "todavía en aviso",
// para no decirle a Walter que se ocultó algo que en realidad sigue visible.
async function guardar(serviceKey, id, campos) {
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/propiedades?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(campos),
    });
    if (!r.ok) console.error('chequear-disponibilidad guardar:', id, r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error('chequear-disponibilidad guardar:', id, e.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChat = process.env.TELEGRAM_CHAT_ID;
  if (!serviceKey || !telegramToken || !telegramChat) {
    res.status(500).json({ error: 'Faltan variables de entorno (SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID)' });
    return;
  }

  // Este cron es también el que manda el mensaje de la mañana. No es que el
  // chequeo y el resumen tengan que ver entre sí: el plan Hobby solo permite
  // DOS tareas programadas y las dos ya estaban usadas, así que el mensaje de
  // la mañana viaja con el único cron que corre a esa hora. Va en su propio
  // try: si el chequeo falla, el resumen se manda igual, y al revés.
  const resumenManana = await enviarResumen({ momento: 'manana' })
    .catch((e) => { console.error('chequear-disponibilidad resumen:', e); return { error: e.message }; });

  try {
    // dias_sin_responder lo agrega la migración
    // 20261126050000_propiedades_dias_sin_responder.sql. Si todavía no corrió,
    // PostgREST responde 400 y se vuelve al comportamiento de antes: avisar
    // sin ocultar nada. Nunca se deja de avisar por una migración pendiente.
    let conContador = true;
    let propRes = await fetch(
      `${SUPA_URL}/rest/v1/propiedades?select=${CAMPOS},dias_sin_responder&publicada=eq.true`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (propRes.status === 400) {
      conContador = false;
      propRes = await fetch(
        `${SUPA_URL}/rest/v1/propiedades?select=${CAMPOS}&publicada=eq.true`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
    }
    if (!propRes.ok) throw new Error('propiedades: ' + (await propRes.text()));
    const propiedades = await propRes.json();

    const resultados = await Promise.all(propiedades.map(chequearPropiedad));

    // Una propiedad se oculta recién al tercer día seguido de no responder.
    // Un corte de red de un día no baja nada: en cuanto vuelve a responder el
    // contador se pone en cero y hay que empezar a fallar de nuevo desde uno.
    const ocultadas = [];
    const enAviso = [];
    if (conContador) {
      for (const p of resultados) {
        const antes = Number(p.dias_sin_responder) || 0;
        if (!p.sospechosa) {
          if (antes !== 0) await guardar(serviceKey, p.id, { dias_sin_responder: 0 });
          continue;
        }
        const dias = antes + 1;
        if (dias >= DIAS_PARA_OCULTAR) {
          // El contador vuelve a cero junto con el ocultado: si Walter la
          // vuelve a publicar, arranca de nuevo con los tres días completos.
          const ok = await guardar(serviceKey, p.id, { publicada: false, dias_sin_responder: 0 });
          (ok ? ocultadas : enAviso).push({ ...p, dias });
        } else {
          await guardar(serviceKey, p.id, { dias_sin_responder: dias });
          enAviso.push({ ...p, dias });
        }
      }
    } else {
      for (const p of resultados) if (p.sospechosa) enAviso.push({ ...p, dias: null });
    }

    if (ocultadas.length || enAviso.length) {
      const ficha = (p) => `${SITE_URL}/propiedad/${encodeURIComponent(p.slug || p.id)}`;
      const bloques = [];
      if (ocultadas.length) {
        bloques.push(
          `🔒 Ocultada${ocultadas.length === 1 ? '' : 's'} del sitio (${DIAS_PARA_OCULTAR} días seguidos sin responder):\n\n` +
          ocultadas.map((p) => `• ${p.titulo}\n  ${p.motivo}\n  ${ficha(p)}`).join('\n\n') +
          `\n\nSi alguna sigue disponible, volvé a publicarla desde Administrar Publicaciones.`
        );
      }
      if (enAviso.length) {
        bloques.push(
          `⚠️ Sin responder, todavía publicada${enAviso.length === 1 ? '' : 's'}:\n\n` +
          enAviso.map((p) => {
            const cuenta = p.dias ? `día ${p.dias} de ${DIAS_PARA_OCULTAR}` : 'aviso';
            return `• ${p.titulo}\n  ${p.motivo} (${cuenta})\n  ${ficha(p)}`;
          }).join('\n\n') +
          (conContador
            ? `\n\nSi sigue${enAviso.length === 1 ? '' : 'n'} así, se oculta${enAviso.length === 1 ? '' : 'n'} sola${enAviso.length === 1 ? '' : 's'} al día ${DIAS_PARA_OCULTAR}.`
            : `\n\nFalta aplicar la migración de "días sin responder", así que por ahora esto es solo un aviso y no se oculta nada solo.`)
        );
      }
      const mensaje = `Disponibilidad — Costo SV\n\n${bloques.join('\n\n———\n\n')}`;
      const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
      });
      if (!tgRes.ok) console.error('chequear-disponibilidad telegram:', tgRes.status, await tgRes.text());
    }

    res.status(200).json({
      ok: true,
      total: propiedades.length,
      con_contador: conContador,
      ocultadas: ocultadas.map((p) => ({ titulo: p.titulo, slug: p.slug, motivo: p.motivo, dias: p.dias })),
      en_aviso: enAviso.map((p) => ({ titulo: p.titulo, slug: p.slug, motivo: p.motivo, dias: p.dias })),
      resumen_manana: resumenManana,
    });
  } catch (err) {
    console.error('api/chequear-disponibilidad:', err);
    res.status(502).json({ error: err.message, resumen_manana: resumenManana });
  }
}
