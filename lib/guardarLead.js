// ============================================================
//  Costo SV — Guardar contacto+lead(+actividad+PDF opcional) en Supabase
//  usando la clave service_role (sin pasar por RLS).
//
//  Compartido entre api/lead.js (formularios/WhatsApp/PDFs del sitio) y
//  api/facebook-leadgen.js (webhook de Meta Lead Ads) — vive fuera de
//  api/ a propósito, para que Vercel no lo trate como una ruta propia.
// ============================================================

import { PRIORIDAD_EMOJI, PRIORIDAD_LABEL } from './leadMeta.js';
import { avisarTelegram } from './telegram.js';

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';

// El texto del aviso. Exportado porque los leads de PRUEBA de Meta no se
// guardan en el panel pero sí avisan, y tienen que verse igual que uno real
// para que la prueba sirva de algo.
export function mensajeLead(b, encabezadoPropio) {
  // Un lead calificado (los del formulario de Meta) encabeza con su
  // prioridad: Walter necesita ver de un vistazo a quién llamar primero.
  const encabezado = encabezadoPropio || (b.prioridad
    ? `${PRIORIDAD_EMOJI[b.prioridad] || ''} Lead ${PRIORIDAD_LABEL[b.prioridad] || ''}`.trim()
    : '🔔 Nuevo lead');
  return [
    encabezado,
    `Nombre: ${b.nombre || 'Sin nombre'}`,
    b.telefono ? `Teléfono: ${b.telefono}` : null,
    // Link tocable: del aviso a la conversación sin copiar el número a mano.
    enlaceWhatsapp(b.telefono),
    b.correo ? `Correo: ${b.correo}` : null,
    b.presupuesto ? `Presupuesto: ${b.presupuesto}` : null,
    b.plazo ? `Compra en: ${b.plazo}` : null,
    b.proposito ? `Para: ${b.proposito}` : null,
    `Origen: ${b.origen || 'formulario_web'}`,
    b.campana ? `Campaña: ${b.campana}` : null,
    b.pagina ? `Página: ${b.pagina}` : null,
    b.propiedad_referencia ? `Referencia: ${b.propiedad_referencia}` : null,
    b.notas ? `Notas: ${b.notas}` : null,
  ].filter(Boolean).join('\n');
}

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

  const filaBase = {
    contacto_id: contactoId,
    origen: b.origen || 'formulario_web',
    interes: b.interes || 'otro',
    propiedad_referencia: b.propiedad_referencia || null,
    notas: b.notas || null,
    campana: b.campana || null,
    pagina: b.pagina || null,
  };
  // Campos de calificación (hoy solo los llenan los leads de Meta Lead Ads).
  const filaExtra = {
    meta_leadgen_id: b.meta_leadgen_id || null,
    fecha_ingreso: b.fecha_ingreso || null,
    proposito: b.proposito || null,
    presupuesto: b.presupuesto || null,
    plazo: b.plazo || null,
    prioridad: b.prioridad || null,
    formulario: b.formulario || null,
    respuestas_raw: b.respuestas_raw || null,
  };
  const hayExtra = Object.values(filaExtra).some((v) => v !== null);

  // Las migraciones las aplica Walter a mano, así que una columna puede no
  // existir todavía. Si Postgres la rechaza (42703), se reintenta con lo
  // básico: es preferible un lead sin calificar a un lead perdido.
  async function insertarLead(fila) {
    return fetch(`${SUPA_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(fila),
    });
  }

  r = await insertarLead(hayExtra ? { ...filaBase, ...filaExtra } : filaBase);
  if (!r.ok && hayExtra) {
    const detalle = await r.text();
    if (detalle.includes('42703') || detalle.includes('Could not find')) {
      console.error('guardarLead: faltan columnas de calificación, guardando sin ellas:', detalle);
      r = await insertarLead(filaBase);
    } else {
      throw new Error('leads: ' + detalle);
    }
  }
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

  await avisarTelegram(mensajeLead(b));

  return { contactoId, leadId, pdfPath };
}
