// ============================================================
//  Costo SV — Webhook de Meta Lead Ads (Facebook/Instagram)
//  Ruta: GET/POST /api/facebook-leadgen
//
//  Reemplaza el rol de HubSpot como receptor de los leads que genera el
//  formulario instantáneo de Facebook: Meta avisa por webhook (solo el id
//  del lead), acá se le pide el detalle completo a la Graph API y se
//  guarda con guardarLead() (mismo camino que los formularios del sitio,
//  con service_role — no depende de RLS ni de la clave anon).
//
//  Configuración necesaria en Vercel: FB_APP_SECRET, FB_PAGE_ACCESS_TOKEN,
//  FB_WEBHOOK_VERIFY_TOKEN (ver plan / instrucciones para Meta for Developers).
// ============================================================

import crypto from 'node:crypto';
import { guardarLead } from '../lib/guardarLead.js';

// Vercel parsea el body como JSON por default, pero para validar la firma
// de Meta hace falta la respuesta apagando ese parseo automático y hace
// falta el body EXACTO en bytes que Meta firmó (JSON.stringify de un objeto
// ya parseado puede no coincidir byte a byte con el original).
export const config = { api: { bodyParser: false } };

async function leerCuerpoCrudo(req) {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  return Buffer.concat(partes);
}

const GRAPH_VERSION = 'v21.0';

// Nombres típicos que Meta usa para los campos estándar del formulario —
// el resto de las preguntas (las que Walter arma a mano) quedan con su
// propio nombre y van todas a "notas".
const CAMPOS_NOMBRE = ['full_name', 'first_name'];
const CAMPOS_TELEFONO = ['phone_number'];
const CAMPOS_CORREO = ['email'];

function valorDe(fieldData, nombres) {
  for (const f of fieldData) {
    if (nombres.includes(f.name) && f.values && f.values[0]) return f.values[0];
  }
  return '';
}

function etiquetaCampo(nombre) {
  return nombre.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function procesarLeadgen(leadgenId, pageAccessToken, serviceKey) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${leadgenId}?fields=field_data,ad_name,form_name&access_token=${encodeURIComponent(pageAccessToken)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Graph API ' + r.status + ': ' + (await r.text()));
  const data = await r.json();
  const fieldData = data.field_data || [];

  let nombre = valorDe(fieldData, CAMPOS_NOMBRE);
  const apellido = valorDe(fieldData, ['last_name']);
  if (nombre && apellido && !nombre.includes(apellido)) nombre = `${nombre} ${apellido}`;

  const usados = new Set([...CAMPOS_NOMBRE, 'last_name', ...CAMPOS_TELEFONO, ...CAMPOS_CORREO]);
  const otrasPreguntas = fieldData
    .filter((f) => !usados.has(f.name))
    .map((f) => `${etiquetaCampo(f.name)}: ${(f.values && f.values[0]) || ''}`)
    .filter((linea) => !linea.endsWith(': '));

  const notasPartes = [];
  if (data.form_name) notasPartes.push('Formulario: ' + data.form_name);
  if (data.ad_name) notasPartes.push('Anuncio: ' + data.ad_name);
  notasPartes.push(...otrasPreguntas);

  await guardarLead(
    {
      nombre: nombre || 'Lead de Facebook',
      telefono: valorDe(fieldData, CAMPOS_TELEFONO),
      correo: valorDe(fieldData, CAMPOS_CORREO),
      origen: 'facebook_ads',
      interes: 'otro',
      propiedad_referencia: data.ad_name || null,
      notas: notasPartes.length ? notasPartes.join('\n') : null,
      actividad: { tipo: 'otro', detalle: 'Lead recibido desde Facebook Lead Ads' },
    },
    serviceKey,
  );
}

export default async function handler(req, res) {
  // Meta verifica la URL del webhook con un GET antes de aceptarlo.
  if (req.method === 'GET') {
    const q = req.query || {};
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === process.env.FB_WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(String(q['hub.challenge'] || ''));
    } else {
      res.status(403).send('Verificación fallida');
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const appSecret = process.env.FB_APP_SECRET;
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!appSecret || !pageAccessToken || !serviceKey) {
    console.error('facebook-leadgen: faltan variables de entorno');
    res.status(500).json({ error: 'Falta configuración del servidor' });
    return;
  }

  const cuerpoCrudo = await leerCuerpoCrudo(req);

  // Firma HMAC del body crudo — sin esto, cualquiera podría inventar leads
  // pegándole a esta URL.
  const firmaRecibida = req.headers['x-hub-signature-256'] || '';
  const firmaEsperada = 'sha256=' + crypto.createHmac('sha256', appSecret).update(cuerpoCrudo).digest('hex');
  const coincide =
    firmaRecibida.length === firmaEsperada.length &&
    crypto.timingSafeEqual(Buffer.from(firmaRecibida), Buffer.from(firmaEsperada));
  if (!coincide) {
    console.error('facebook-leadgen: firma inválida');
    res.status(401).json({ error: 'Firma inválida' });
    return;
  }

  try {
    const body = JSON.parse(cuerpoCrudo.toString('utf8') || '{}');
    const entradas = body.entry || [];
    for (const entrada of entradas) {
      for (const cambio of entrada.changes || []) {
        if (cambio.field !== 'leadgen') continue;
        const leadgenId = cambio.value && cambio.value.leadgen_id;
        if (!leadgenId) continue;
        await procesarLeadgen(leadgenId, pageAccessToken, serviceKey).catch((e) =>
          console.error('facebook-leadgen procesar:', leadgenId, e),
        );
      }
    }
    // Meta espera 200 rápido; no bloquear la respuesta por errores individuales.
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('facebook-leadgen:', err);
    res.status(200).json({ ok: true }); // 200 igual, para que Meta no reintente en loop
  }
}
