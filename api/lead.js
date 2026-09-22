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

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';

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

  const b = req.body || {};
  if (!b.nombre && !b.telefono && !b.correo) {
    res.status(400).json({ error: 'Faltan datos de contacto' });
    return;
  }

  const headers = { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  try {
    const contactoId = crypto.randomUUID();
    let r = await fetch(`${SUPA_URL}/rest/v1/contactos`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ id: contactoId, nombre: b.nombre || 'Sin nombre', telefono: b.telefono || '', correo: b.correo || '' }),
    });
    if (!r.ok) throw new Error('contactos: ' + (await r.text()));

    r = await fetch(`${SUPA_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        contacto_id: contactoId,
        origen: b.origen || 'formulario_web',
        interes: b.interes || 'otro',
        propiedad_referencia: b.propiedad_referencia || null,
        notas: b.notas || null,
      }),
    });
    if (!r.ok) throw new Error('leads: ' + (await r.text()));
    const leadRows = await r.json();
    const leadId = leadRows && leadRows[0] && leadRows[0].id;

    if (leadId && b.actividad && b.actividad.tipo) {
      fetch(`${SUPA_URL}/rest/v1/actividades`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ lead_id: leadId, tipo: b.actividad.tipo, detalle: b.actividad.detalle || null }),
      }).catch((e) => console.error('api/lead actividad:', e));
    }

    let pdfPath = null;
    if (leadId && b.pdf_base64) {
      const bucket = b.pdf_bucket || 'ofertas';
      pdfPath = `${new Date().getFullYear()}/${leadId}.pdf`;
      const buf = Buffer.from(b.pdf_base64, 'base64');
      const up = await fetch(`${SUPA_URL}/storage/v1/object/${bucket}/${pdfPath}`, {
        method: 'POST',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
        body: buf,
      });
      if (up.ok) {
        await fetch(`${SUPA_URL}/rest/v1/leads?id=eq.${leadId}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ oferta_pdf_path: pdfPath }),
        }).catch((e) => console.error('api/lead patch pdf path:', e));
      } else {
        console.error('api/lead subida pdf:', up.status, await up.text());
        pdfPath = null;
      }
    }

    res.status(200).json({ contactoId, leadId, pdfPath });
  } catch (err) {
    console.error('api/lead:', err);
    res.status(502).json({ error: err.message });
  }
}
