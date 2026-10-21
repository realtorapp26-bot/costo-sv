// ============================================================
//  Costo SV — Completar la firma del vendedor en un contrato de
//  comercialización desde el link público (contrato-firma.html), usando
//  service_role (sin pasar por RLS). El contrato ya existe (lo creó el
//  corredor en el panel, con su propia firma ya puesta) -- acá solo se
//  agrega la firma del vendedor, se sube el PDF final y se marca firmado.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const BUCKET = 'contratos-documentos';

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

// b: { contrato_id, vendedor_firma_nombre, vendedor_firma_fecha, pdf_base64 }
// Devuelve: { ok: true }
export async function guardarContrato(b, serviceKey) {
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  if (!b.contrato_id) throw new Error('Falta el identificador del contrato');
  if (!b.vendedor_firma_nombre) throw new Error('Falta el nombre de quien firma');
  if (!b.pdf_base64) throw new Error('Falta el PDF generado');

  const headers = { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const check = await fetch(`${SUPA_URL}/rest/v1/contratos_comercializacion?id=eq.${b.contrato_id}&select=id,numero,vendedor_nombre,estado`, { headers });
  if (!check.ok) throw new Error('No se pudo verificar el contrato: ' + (await check.text()));
  const filas = await check.json();
  if (!filas.length) throw new Error('No se encontró el contrato indicado.');
  const contrato = filas[0];
  if (contrato.estado !== 'pendiente') throw new Error('Este contrato ya fue firmado o cancelado y no se puede volver a firmar.');

  const sello = Date.now();
  const pdfPath = await subirArchivoBase64(b.pdf_base64, 'application/pdf', `${b.contrato_id}/contrato-firmado-${sello}.pdf`, serviceKey);

  const patch = {
    estado: 'firmado',
    vendedor_firma_nombre: b.vendedor_firma_nombre,
    vendedor_firma_fecha: b.vendedor_firma_fecha || new Date().toISOString().slice(0, 10),
    pdf_path: pdfPath,
    completado_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const upd = await fetch(`${SUPA_URL}/rest/v1/contratos_comercializacion?id=eq.${b.contrato_id}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!upd.ok) throw new Error('No se pudo guardar el contrato: ' + (await upd.text()));

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChat = process.env.TELEGRAM_CHAT_ID;
  if (telegramToken && telegramChat) {
    const mensaje = `✅ Contrato firmado por el vendedor\nContrato: ${contrato.numero}\nVendedor: ${contrato.vendedor_nombre}`;
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
      });
      if (!tgRes.ok) console.error('guardarContrato telegram:', tgRes.status, await tgRes.text());
    } catch (e) {
      console.error('guardarContrato telegram:', e);
    }
  }

  return { ok: true };
}
