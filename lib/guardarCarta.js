// ============================================================
//  Costo SV — Archivar una carta generada (oferta / aceptación / contraoferta)
//  Guarda los términos en la tabla "cartas" y sube el PDF firmado al bucket
//  privado "ofertas" bajo "cartas/<id>.pdf", para que queden consultables
//  desde el panel. Se llama desde api/lead.js con la clave service_role.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';

// b: { carta: { tipo, transaccion, idioma, cliente_nombre, ... }, pdf_base64? }
// Devuelve: { cartaId, numero, pdfPath }
export async function guardarCarta(b, serviceKey) {
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  const c = b.carta || {};
  if (!['oferta', 'aceptacion', 'contraoferta'].includes(c.tipo)) {
    throw new Error('Tipo de carta inválido');
  }

  const headers = { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const cartaId = crypto.randomUUID();

  let r = await fetch(`${SUPA_URL}/rest/v1/cartas`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      id: cartaId,
      tipo: c.tipo,
      transaccion: c.transaccion === 'ALQUILER' ? 'ALQUILER' : 'VENTA',
      idioma: c.idioma === 'en' ? 'en' : 'es',
      cliente_nombre: c.cliente_nombre || null,
      cliente_documento: c.cliente_documento || null,
      propietario_nombre: c.propietario_nombre || null,
      propiedad_municipio: c.propiedad_municipio || null,
      propiedad_departamento: c.propiedad_departamento || null,
      propiedad_direccion: c.propiedad_direccion || null,
      monto: Number(c.monto) || null,
      precio_lista: Number(c.precio_lista) || null,
      forma_pago: c.forma_pago || null,
      detalle_pago: c.detalle_pago || null,
      plazo: c.plazo || null,
      bienes: Array.isArray(c.bienes) ? c.bienes : [],
      gastos_cierre: c.gastos_cierre || null,
      notas: c.notas || null,
      lead_id: b.lead_id || null,
    }),
  });
  if (!r.ok) throw new Error('cartas: ' + (await r.text()));
  const filas = await r.json();
  const numero = filas && filas[0] && filas[0].numero;

  let pdfPath = null;
  if (b.pdf_base64) {
    pdfPath = `cartas/${cartaId}.pdf`;
    const up = await fetch(`${SUPA_URL}/storage/v1/object/ofertas/${pdfPath}`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
      body: Buffer.from(b.pdf_base64, 'base64'),
    });
    if (up.ok) {
      await fetch(`${SUPA_URL}/rest/v1/cartas?id=eq.${cartaId}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ pdf_path: pdfPath }),
      }).catch((e) => console.error('guardarCarta patch pdf:', e));
      // El mismo archivo queda colgado del lead, así se puede abrir tanto
      // desde el archivo de cartas como desde la ficha del lead.
      if (b.lead_id) {
        await fetch(`${SUPA_URL}/rest/v1/leads?id=eq.${b.lead_id}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ oferta_pdf_path: pdfPath }),
        }).catch((e) => console.error('guardarCarta patch lead:', e));
      }
    } else {
      console.error('guardarCarta subida pdf:', up.status, await up.text());
      pdfPath = null;
    }
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChat = process.env.TELEGRAM_CHAT_ID;
  if (telegramToken && telegramChat) {
    const etiqueta = { oferta: 'Carta de oferta', aceptacion: 'Aceptación de oferta', contraoferta: 'Contraoferta' }[c.tipo];
    const mensaje = [
      `📄 ${etiqueta} firmada (${numero || cartaId})`,
      c.cliente_nombre ? `Cliente: ${c.cliente_nombre}` : null,
      c.propietario_nombre ? `Propietario: ${c.propietario_nombre}` : null,
      c.propiedad_direccion ? `Inmueble: ${c.propiedad_direccion}` : null,
      c.monto ? `Monto: US$ ${Number(c.monto).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null,
    ].filter(Boolean).join('\n');
    try {
      const tg = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
      });
      if (!tg.ok) console.error('guardarCarta telegram:', tg.status, await tg.text());
    } catch (e) {
      console.error('guardarCarta telegram:', e);
    }
  }

  return { cartaId, numero, pdfPath };
}
