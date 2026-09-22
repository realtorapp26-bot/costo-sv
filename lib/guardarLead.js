// ============================================================
//  Costo SV — Guardar contacto+lead(+actividad+PDF opcional) en Supabase
//  usando la clave service_role (sin pasar por RLS).
//
//  Compartido entre api/lead.js (formularios/WhatsApp/PDFs del sitio) y
//  api/facebook-leadgen.js (webhook de Meta Lead Ads) — vive fuera de
//  api/ a propósito, para que Vercel no lo trate como una ruta propia.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';

// b: { nombre, telefono, correo, origen, interes, propiedad_referencia,
//      notas, actividad?: { tipo, detalle }, pdf_base64?, pdf_bucket? }
// Devuelve: { contactoId, leadId, pdfPath }
export async function guardarLead(b, serviceKey) {
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  if (!b.nombre && !b.telefono && !b.correo) throw new Error('Faltan datos de contacto');

  const headers = { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

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
    }).catch((e) => console.error('guardarLead actividad:', e));
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
      }).catch((e) => console.error('guardarLead patch pdf path:', e));
    } else {
      console.error('guardarLead subida pdf:', up.status, await up.text());
      pdfPath = null;
    }
  }

  return { contactoId, leadId, pdfPath };
}
