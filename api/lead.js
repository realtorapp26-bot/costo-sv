// ============================================================
//  Costo SV — Registrar lead en el CRM (server-side, service_role)
//  Ruta: POST /api/lead
//
//  Reemplaza las escrituras directas del navegador a contactos/leads con
//  la clave anon (que dependen de sus políticas RLS). Esta función usa
//  SUPABASE_SERVICE_ROLE_KEY, que no pasa por RLS — inmune tanto a que
//  alguien rompa una política sin querer como a fallas de Supabase que
//  afecten específicamente la validación de JWT del rol anon.
//
//  Body (lead): { nombre, telefono, correo, origen, interes,
//                 propiedad_referencia, notas, actividad?: { tipo, detalle },
//                 pdf_base64?, pdf_bucket? }
//  Devuelve: { contactoId, leadId, pdfPath }
//
//  Body (completar el teléfono de un lead de WhatsApp, cuando viene
//  completar_lead): ver lib/completarContacto.js.
//  Body (completar KYC, cuando viene kyc_caso_id): ver lib/guardarKyc.js.
//  Body (firmar contrato, cuando viene contrato_id): ver lib/guardarContrato.js.
//  GET ?contrato_id=... : lee un contrato para la página pública de firma
//  (ver lib/obtenerContrato.js) -- también comparte esta función.
//  Todo esto comparte esta misma función en vez de ser rutas /api propias
//  para no sumar funciones serverless -- el plan Hobby de Vercel tiene un
//  tope de 12 por deployment y ya estábamos justo en el límite.
//  Devuelve: { ok: true } (POST) o el contrato (GET)
// ============================================================

import { guardarLead } from '../lib/guardarLead.js';
import { completarContacto } from '../lib/completarContacto.js';
import { guardarKyc } from '../lib/guardarKyc.js';
import { guardarContrato } from '../lib/guardarContrato.js';
import { guardarCarta, TIPOS_CARTA } from '../lib/guardarCarta.js';
import { obtenerContrato } from '../lib/obtenerContrato.js';

export default async function handler(req, res) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel' });
    return;
  }

  if (req.method === 'GET') {
    // Diagnóstico del aviso por Telegram. Los leads entraban bien a la base
    // pero el aviso no llegaba al teléfono, y los logs de Vercel se borran
    // antes de poder mirarlos. Esto pregunta a Telegram si la credencial y el
    // chat siguen siendo válidos. NO manda ningún mensaje y NO devuelve el
    // token: solo si cada cosa funciona y qué dice Telegram cuando no.
    if (req.query?.diagnostico === 'telegram') {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chat = process.env.TELEGRAM_CHAT_ID;
      const salida = { token_configurado: !!token, chat_configurado: !!chat };
      if (token) {
        try {
          const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const d = await r.json();
          salida.token_valido = !!d.ok;
          salida.bot = d.ok ? d.result.username : null;
          if (!d.ok) salida.error_token = d.description;
        } catch (e) { salida.token_valido = false; salida.error_token = e.message; }
      }
      if (token && chat) {
        try {
          const r = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chat)}`);
          const d = await r.json();
          salida.chat_valido = !!d.ok;
          if (!d.ok) salida.error_chat = d.description;
        } catch (e) { salida.chat_valido = false; salida.error_chat = e.message; }
      }
      res.status(200).json(salida);
      return;
    }

    const contratoId = req.query?.contrato_id;
    if (!contratoId) {
      res.status(400).json({ error: 'Falta contrato_id' });
      return;
    }
    try {
      res.status(200).json(await obtenerContrato(contratoId, serviceKey));
    } catch (err) {
      console.error('api/lead GET:', err);
      res.status(404).json({ error: err.message });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const body = req.body || {};

    // Carta firmada (oferta de compra o de venta, aceptación, contraoferta):
    // va a su propio archivo, como los contratos. No crea lead ni contacto --
    // el pipeline de leads es para interesados que llegan del sitio, no para
    // documentos.
    if (body.carta) {
      if (!TIPOS_CARTA.includes(body.carta.tipo)) {
        res.status(400).json({ error: 'Tipo de carta inválido' });
        return;
      }
      res.status(200).json(await guardarCarta(body, serviceKey));
      return;
    }

    const resultado = body.completar_lead
      ? await completarContacto(body, serviceKey)
      : body.contrato_id
      ? await guardarContrato(body, serviceKey)
      : body.kyc_caso_id
      ? await guardarKyc(body, serviceKey)
      : await guardarLead(body, serviceKey);
    res.status(200).json(resultado);
  } catch (err) {
    console.error('api/lead:', err);
    res.status(502).json({ error: err.message });
  }
}
