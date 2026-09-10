// ============================================================
//  Costo SV — Proxy de imágenes con CORS
//  Ruta: /api/img?u=<url absoluta de una imagen>
//
//  Único propósito: que html2canvas (generación del dossier PDF en el
//  navegador) pueda rasterizar la foto principal de la propiedad aunque
//  venga del CDN de RE/MAX, que no manda cabeceras CORS.
//
//  Con allowlist de hosts para no quedar como proxy abierto / SSRF.
// ============================================================

const HOSTS_PERMITIDOS = [
  /(^|\.)supabase\.co$/i,
  /(^|\.)remax-cca\.com$/i,
  /(^|\.)cloudfront\.net$/i,
  /(^|\.)azureedge\.net$/i,           // CDN de fotos de RE/MAX (remaxcaribbeanandcentralamerica.azureedge.net)
  /(^|\.)blob\.core\.windows\.net$/i, // Azure Blob directo
  /(^|\.)remax\.com$/i,
  /^images\.unsplash\.com$/i,
];

const MAX_BYTES = 8 * 1024 * 1024;

export default async function handler(req, res) {
  const raw = (req.query && req.query.u) || '';
  const u = String(Array.isArray(raw) ? raw[0] : raw).trim();

  let url;
  try {
    url = new URL(u);
  } catch (_) {
    res.status(400).json({ error: 'URL inválida' });
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    res.status(400).json({ error: 'Protocolo no permitido' });
    return;
  }
  if (!HOSTS_PERMITIDOS.some((re) => re.test(url.hostname))) {
    res.status(400).json({ error: 'Host no permitido' });
    return;
  }

  try {
    const r = await fetch(url.href);
    if (!r.ok) {
      res.status(502).json({ error: 'La imagen de origen respondió ' + r.status });
      return;
    }
    const tipo = r.headers.get('content-type') || '';
    if (!tipo.startsWith('image/')) {
      res.status(415).json({ error: 'El origen no es una imagen' });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) {
      res.status(413).json({ error: 'Imagen vacía o demasiado grande' });
      return;
    }

    res.setHeader('Content-Type', tipo);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(buf);
  } catch (err) {
    console.error('img proxy:', err);
    res.status(500).json({ error: err.message });
  }
}
