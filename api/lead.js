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
//  Body: { nombre, telefono, correo, origen, interes, propiedad_referencia,
//          notas, actividad?: { tipo, detalle }, pdf_base64?, pdf_bucket? }
//  Devuelve: { contactoId, leadId, pdfPath }
// ============================================================

import { guardarLead } from '../lib/guardarLead.js';

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
    const resultado = await guardarLead(req.body || {}, serviceKey);
    res.status(200).json(resultado);
  } catch (err) {
    console.error('api/lead:', err);
    res.status(502).json({ error: err.message });
  }
}
