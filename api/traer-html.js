// ============================================================
//  Costo SV — Traer HTML de un listado por su link
//  Ruta: POST /api/traer-html   body: { url }
//
//  Reemplaza el paso manual de Ctrl+U + Ctrl+C: el servidor visita el
//  link público del listado y devuelve el HTML crudo, para que el panel
//  lo procese exactamente igual que un pegado manual (mismas funciones
//  extraerFotosDeTexto / extraerCoordenadasDeTexto / etc. y el mismo
//  /api/extraer-datos). Con allowlist de hosts para no quedar como
//  proxy abierto / SSRF — solo dominios de RE/MAX Central America.
// ============================================================

const HOSTS_PERMITIDOS = [
  /(^|\.)remax-ccamls\.com$/i,          // links "share" (ej. share.remax-ccamls.com/show/...)
  /(^|\.)remax-centralamerica\.com$/i,  // sitio público de listados
];

const MAX_BYTES = 3 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const raw = (req.body && req.body.url) || '';
  const u = String(raw).trim();

  let url;
  try {
    url = new URL(u);
  } catch (_) {
    res.status(400).json({ error: 'Link inválido' });
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    res.status(400).json({ error: 'Protocolo no permitido' });
    return;
  }
  if (!HOSTS_PERMITIDOS.some((re) => re.test(url.hostname))) {
    res.status(400).json({ error: 'Ese link no es de un dominio de RE/MAX reconocido. Pegá el link del listado (share.remax-ccamls.com o remax-centralamerica.com).' });
    return;
  }

  try {
    const r = await fetch(url.href, {
      redirect: 'follow',
      headers: {
        // Server sin esto algunos hosts devuelven una versión reducida de la página.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!r.ok) {
      res.status(502).json({ error: 'El listado respondió ' + r.status + '. Verificá que el link sea correcto y siga público.' });
      return;
    }

    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) {
      res.status(502).json({ error: 'El listado devolvió una página vacía.' });
      return;
    }
    if (buf.length > MAX_BYTES) {
      res.status(413).json({ error: 'La página del listado es demasiado grande.' });
      return;
    }

    const html = buf.toString('utf8');
    res.status(200).json({ html });
  } catch (err) {
    console.error('traer-html:', err);
    res.status(500).json({ error: 'No se pudo traer el listado: ' + err.message });
  }
}
