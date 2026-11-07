// ============================================================
//  Costo SV — Aviso por Telegram
//
//  Vivía adentro de guardarLead(), pero los leads de prueba de Meta no se
//  guardan en el panel y aun así tienen que avisar: sin un aviso, probar
//  el circuito completo es imposible. Por eso el envío está acá, separado
//  del guardado.
// ============================================================

export async function avisarTelegram(texto) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat || !texto) return false;

  // Se espera (await) a propósito: en un entorno serverless como Vercel, un
  // fetch "en segundo plano" sin await puede quedar cortado a medias apenas
  // la función responde. El error se atrapa, así que si Telegram falla no
  // rompe lo que lo llamó.
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }),
    });
    if (!r.ok) console.error('avisarTelegram:', r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error('avisarTelegram:', e);
    return false;
  }
}
