// ============================================================
//  Costo SV — Chequeo diario de propiedades que podrían haberse caído
//
//  Disparado por Vercel Cron (ver vercel.json). Para cada propiedad
//  publicada, revisa si su link de RE/MAX Connect (link_referencia) y/o
//  su foto principal siguen respondiendo. Si alguna ya no responde, manda
//  un aviso por Telegram para que Walter la revise y la quite a mano —
//  nunca se despublica sola, esto es solo un aviso.
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

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const SITE_URL = 'https://guerrero-properties.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const HOST_CHEQUEABLE = /(^|\.)remax-ccamls\.com$/i;
const TIMEOUT_MS = 8000;

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

  try {
    const propRes = await fetch(
      `${SUPA_URL}/rest/v1/propiedades?select=id,titulo,slug,link_referencia,fotos&publicada=eq.true`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!propRes.ok) throw new Error('propiedades: ' + (await propRes.text()));
    const propiedades = await propRes.json();

    const resultados = await Promise.all(propiedades.map(chequearPropiedad));
    const sospechosas = resultados.filter((p) => p.sospechosa);

    if (sospechosas.length) {
      const lineas = sospechosas.map((p) =>
        `• ${p.titulo}\n  ${p.motivo}\n  ${SITE_URL}/propiedad/${encodeURIComponent(p.slug || p.id)}`
      );
      const mensaje = `⚠️ Revisar disponibilidad — Costo SV\n\n${sospechosas.length} propiedad${sospechosas.length === 1 ? '' : 'es'} publicada${sospechosas.length === 1 ? '' : 's'} que podría${sospechosas.length === 1 ? '' : 'n'} ya no estar disponible${sospechosas.length === 1 ? '' : 's'} en RE/MAX Connect:\n\n${lineas.join('\n\n')}\n\nRevisalas y quitalas del sitio si ya no están — esto es solo un aviso, no se despublican solas.`;
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
      sospechosas: sospechosas.map((p) => ({ titulo: p.titulo, slug: p.slug, motivo: p.motivo })),
    });
  } catch (err) {
    console.error('api/chequear-disponibilidad:', err);
    res.status(502).json({ error: err.message });
  }
}
