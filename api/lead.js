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
import { guardarKyc } from '../lib/guardarKyc.js';
import { guardarContrato } from '../lib/guardarContrato.js';
import { obtenerContrato } from '../lib/obtenerContrato.js';

export default async function handler(req, res) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel' });
    return;
  }

  if (req.method === 'GET') {
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
    const resultado = body.contrato_id
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
