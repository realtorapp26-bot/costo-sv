// ============================================================
//  Costo SV — Completar un KYC desde el link público (server-side, service_role)
//  Ruta: POST /api/kyc-completar
//
//  Body: { caso_id, cliente_fecha_nacimiento, cliente_nacionalidad,
//          cliente_pais_residencia, cliente_direccion, cliente_documento_tipo,
//          cliente_documento_numero, cliente_telefono, cliente_ocupacion,
//          pdf_base64, doc_frontal_base64?, doc_frontal_mime?,
//          doc_reverso_base64?, doc_reverso_mime? }
//  Devuelve: { ok: true }
// ============================================================

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
    const resultado = await guardarKyc(req.body || {}, serviceKey);
    res.status(200).json(resultado);
  } catch (err) {
    console.error('api/kyc-completar:', err);
    res.status(502).json({ error: err.message });
  }
}
