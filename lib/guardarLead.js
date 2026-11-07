// ============================================================
//  Costo SV — Guardar contacto+lead(+actividad+PDF opcional) en Supabase
//  usando la clave service_role (sin pasar por RLS).
//
//  Compartido entre api/lead.js (formularios/WhatsApp/PDFs del sitio) y
//  api/facebook-leadgen.js (webhook de Meta Lead Ads) — vive fuera de
//  api/ a propósito, para que Vercel no lo trate como una ruta propia.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';

// Link de WhatsApp para el aviso de Telegram. Sin esto el número llega como
// texto plano y hay que copiarlo a mano para poder escribirle; así el aviso
// lleva directo a la conversación. Un número suelto de 8 dígitos es
// salvadoreño; los de Meta ya vienen con código de país.
export function enlaceWhatsapp(telefono) {
  const digitos = String(telefono || '').replace(/\D/g, '');
  if (digitos.length < 8) return null;
  return '💬 Escribirle: https://wa.me/' + (digitos.length === 8 ? '503' + digitos : digitos);
}

// b: { nombre, telefono, correo, origen, interes, propiedad_referencia,
//      notas, campana?, pagina?, actividad?: { tipo, detalle },
//      pdf_base64?, pdf_bucket? }
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
      campana: b.campana || null,
      pagina: b.pagina || null,
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

  // Aviso por Telegram a Walter. Se espera (await) a propósito: en un
  // entorno serverless como Vercel, un fetch "en segundo plano" sin await
  // puede quedar cortado a medias en cuanto la función termina de
  // responder — no es lo mismo que un servidor tradicional siempre
  // corriendo. El error se atrapa igual, así que si Telegram falla no
  // rompe el guardado del lead.
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChat = process.env.TELEGRAM_CHAT_ID;
  if (telegramToken && telegramChat) {
    const mensaje = [
      '🔔 Nuevo lead',
      `Nombre: ${b.nombre || 'Sin nombre'}`,
      b.telefono ? `Teléfono: ${b.telefono}` : null,
      // Link tocable: del aviso a la conversación sin copiar el número a mano.
      enlaceWhatsapp(b.telefono),
      b.correo ? `Correo: ${b.correo}` : null,
      `Origen: ${b.origen || 'formulario_web'}`,
      b.campana ? `Campaña: ${b.campana}` : null,
      b.pagina ? `Página: ${b.pagina}` : null,
      b.propiedad_referencia ? `Referencia: ${b.propiedad_referencia}` : null,
      b.notas ? `Notas: ${b.notas}` : null,
    ].filter(Boolean).join('\n');
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
      });
      if (!tgRes.ok) console.error('guardarLead telegram:', tgRes.status, await tgRes.text());
    } catch (e) {
      console.error('guardarLead telegram:', e);
    }
  }

  return { contactoId, leadId, pdfPath };
}
