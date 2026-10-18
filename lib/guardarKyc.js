// ============================================================
//  Costo SV — Completar un expediente de KYC desde el link público
//  (kyc-cliente.html), usando la clave service_role (sin pasar por RLS).
//  El expediente ya existe (lo creó el agente en el panel) -- acá solo se
//  completan los datos del cliente, se suben los documentos que falten y
//  el PDF firmado, y se marca como completado.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const BUCKET = 'kyc-documentos';

async function subirArchivoBase64(base64, contentType, ruta, serviceKey) {
  const buf = Buffer.from(base64, 'base64');
  const res = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${ruta}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: buf,
  });
  if (!res.ok) throw new Error('subida ' + ruta + ': ' + (await res.text()));
  return ruta;
}

// b: { kyc_caso_id, cliente_fecha_nacimiento, cliente_nacionalidad,
//      cliente_pais_residencia, cliente_direccion, cliente_documento_tipo,
//      cliente_documento_numero, cliente_telefono, cliente_ocupacion,
//      pdf_base64, doc_frontal_base64?, doc_reverso_base64? }
// Devuelve: { ok: true }
export async function guardarKyc(b, serviceKey) {
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  if (!b.kyc_caso_id) throw new Error('Falta el identificador del caso de KYC');
  if (!b.pdf_base64) throw new Error('Falta el PDF generado');

  const headers = { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // Confirma que el caso existe antes de subir nada (evita archivos huérfanos
  // en Storage si mandan un caso_id inválido).
  const check = await fetch(`${SUPA_URL}/rest/v1/kyc_solicitudes?id=eq.${b.kyc_caso_id}&select=id,cliente_nombre,numero`, { headers });
  if (!check.ok) throw new Error('No se pudo verificar el caso: ' + (await check.text()));
  const filas = await check.json();
  if (!filas.length) throw new Error('No se encontró el caso de KYC indicado.');
  const caso = filas[0];

  const sello = Date.now();
  const pdfPath = await subirArchivoBase64(b.pdf_base64, 'application/pdf', `${b.kyc_caso_id}/kyc-firmado-${sello}.pdf`, serviceKey);

  const patch = {
    cliente_fecha_nacimiento: b.cliente_fecha_nacimiento || null,
    cliente_nacionalidad: b.cliente_nacionalidad || null,
    cliente_pais_residencia: b.cliente_pais_residencia || null,
    cliente_direccion: b.cliente_direccion || null,
    cliente_documento_tipo: b.cliente_documento_tipo || null,
    cliente_documento_numero: b.cliente_documento_numero || null,
    cliente_telefono: b.cliente_telefono || null,
    cliente_ocupacion: b.cliente_ocupacion || null,
    pdf_path: pdfPath,
    completado_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Si el agente no había subido los documentos de identidad, se guardan
  // los que mande el cliente ahora; si ya existían, no se pisan.
  if (b.doc_frontal_base64) {
    patch.doc_frontal_path = await subirArchivoBase64(b.doc_frontal_base64, b.doc_frontal_mime || 'image/jpeg', `${b.kyc_caso_id}/frontal-${sello}.jpg`, serviceKey);
  }
  if (b.doc_reverso_base64) {
    patch.doc_reverso_path = await subirArchivoBase64(b.doc_reverso_base64, b.doc_reverso_mime || 'image/jpeg', `${b.kyc_caso_id}/reverso-${sello}.jpg`, serviceKey);
  }

  const upd = await fetch(`${SUPA_URL}/rest/v1/kyc_solicitudes?id=eq.${b.kyc_caso_id}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!upd.ok) throw new Error('No se pudo guardar el KYC: ' + (await upd.text()));

  // Aviso a Walter (mismo criterio que guardarLead.js: se espera a propósito,
  // un entorno serverless puede cortar un fetch en segundo plano a medias).
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChat = process.env.TELEGRAM_CHAT_ID;
  if (telegramToken && telegramChat) {
    const mensaje = `✅ KYC completado por el cliente\nCaso: ${caso.numero}\nCliente: ${caso.cliente_nombre}`;
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
      });
      if (!tgRes.ok) console.error('guardarKyc telegram:', tgRes.status, await tgRes.text());
    } catch (e) {
      console.error('guardarKyc telegram:', e);
    }
  }

  return { ok: true };
}
