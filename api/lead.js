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
//  Comparte esta misma función en vez de ser una ruta /api propia para no
//  sumar una función serverless más -- el plan Hobby de Vercel tiene un
//  tope de 12 por deployment y ya estábamos justo en el límite.
//  Devuelve: { ok: true }
// ============================================================

import { guardarLead } from '../lib/guardarLead.js';
import { guardarKyc } from '../lib/guardarKyc.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel' });
    return;
  }

  try {
    const body = req.body || {};
    const resultado = body.kyc_caso_id
      ? await guardarKyc(body, serviceKey)
      : await guardarLead(body, serviceKey);
    res.status(200).json(resultado);
  } catch (err) {
    console.error('api/lead:', err);
    res.status(502).json({ error: err.message });
  }
}
