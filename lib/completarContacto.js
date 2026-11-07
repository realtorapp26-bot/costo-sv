// ============================================================
//  Costo SV — Completar un lead de WhatsApp con el teléfono real
//
//  Por qué existe: un clic en el botón de WhatsApp abre la app con el
//  mensaje precargado, pero la persona todavía tiene que tocar Enviar
//  adentro de WhatsApp. El sitio NUNCA se entera del número de quien hizo
//  clic — ese dato vive en WhatsApp y no vuelve al navegador. Resultado:
//  el lead quedaba como "Contacto por WhatsApp" con teléfono y correo
//  vacíos, y Walter veía el interés sin tener a quién llamar.
//
//  Acá se completa ESE MISMO lead (no se crea uno nuevo, para no duplicar
//  la fila) cuando la persona deja su número en el aviso que aparece
//  después del clic.
//
//  Body: { completar_lead: <uuid del lead>, telefono, nombre?, correo? }
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';

export async function completarContacto(b, serviceKey) {
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  const telefono = String(b.telefono || '').trim();
  const correo = String(b.correo || '').trim();
  if (!telefono && !correo) throw new Error('Falta el teléfono o el correo');

  const headers = { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // El lead tiene que existir: así un id inventado no crea ni ensucia nada.
  const r = await fetch(
    `${SUPA_URL}/rest/v1/leads?id=eq.${encodeURIComponent(b.completar_lead)}&select=id,contacto_id,notas,propiedad_referencia`,
    { headers },
  );
  if (!r.ok) throw new Error('leads: ' + (await r.text()));
  const filas = await r.json();
  if (!filas.length) throw new Error('No se encontró el lead a completar');
  const lead = filas[0];

  const nombre = String(b.nombre || '').trim();
  const campos = {};
  if (telefono) campos.telefono = telefono;
  if (correo) campos.correo = correo;
  // Solo pisa el nombre si el que hay es el genérico que pone el clic.
  if (nombre) campos.nombre = nombre;

  const rc = await fetch(`${SUPA_URL}/rest/v1/contactos?id=eq.${lead.contacto_id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(campos),
  });
  if (!rc.ok) throw new Error('contactos: ' + (await rc.text()));

  const nota = 'Dejó sus datos en el aviso posterior al clic de WhatsApp (puede no haber enviado el mensaje).';
  await fetch(`${SUPA_URL}/rest/v1/leads?id=eq.${lead.id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ notas: lead.notas ? lead.notas + '\n' + nota : nota }),
  }).catch((e) => console.error('completarContacto notas:', e));

  // El aviso a Walter es el punto de todo esto: acá sí hay a quién llamar.
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChat = process.env.TELEGRAM_CHAT_ID;
  if (telegramToken && telegramChat) {
    const mensaje = [
      '📞 Un lead de WhatsApp dejó su número',
      nombre ? `Nombre: ${nombre}` : null,
      telefono ? `Teléfono: ${telefono}` : null,
      correo ? `Correo: ${correo}` : null,
      lead.propiedad_referencia ? `Referencia: ${lead.propiedad_referencia}` : null,
      'Puede que no haya enviado el mensaje por WhatsApp — conviene escribirle vos.',
    ].filter(Boolean).join('\n');
    try {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
      });
    } catch (e) {
      console.error('completarContacto telegram:', e);
    }
  }

  return { ok: true, leadId: lead.id };
}
