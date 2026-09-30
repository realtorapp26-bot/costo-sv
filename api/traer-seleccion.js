// ============================================================
//  Costo SV — Traer una selección completa de RE/MAX Connect
//  Ruta: POST /api/traer-seleccion   body: { url }
//
//  Las "selecciones" (share.remax-ccamls.com/s/<codigo>) son una página
//  con varias propiedades juntas (foto, título, precio, ubicación,
//  cuartos/baños y su propio link). El servidor visita el link, parsea
//  cada tarjeta con expresiones regulares (la plantilla del portal es
//  consistente) y devuelve la lista lista para insertar en bloque —
//  sin pasar por Claude, porque el HTML ya viene bien estructurado.
//  Mismo allowlist de host que api/traer-html.js, por la misma razón
//  (no quedar como proxy abierto / SSRF).
// ============================================================

const HOSTS_PERMITIDOS = [/(^|\.)remax-ccamls\.com$/i];
const MAX_BYTES = 5 * 1024 * 1024;

const MAPA_TIPO_PROPIEDAD = {
  'house/villa': 'Casa/Villa',
  'apartment/condo': 'Apartamento/Condominio',
  'land/lot': 'Lote/Terreno',
  business: 'Negocio',
  office: 'Oficina',
  warehouse: 'Bodega',
  building: 'Edificio',
  'multi-family': 'Multifamiliar',
  townhouse: 'Townhouse',
  'marina/slip': 'Marina Slip',
  'rural area': 'Zona Rural',
};

function categoriaDesdeTipo(tipoIngles) {
  const t = (tipoIngles || '').toLowerCase();
  if (t.includes('land') || t.includes('lot')) return 'Proyectos y Desarrollos';
  if (t.includes('business') || t.includes('office') || t.includes('warehouse') || t.includes('building')) return 'Comercial / Industrial';
  return 'Vivienda Residencial';
}

function decodificarEntidades(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function limpiarPrecio(precio) {
  if (!precio) return null;
  const limpio = decodificarEntidades(precio).replace(/\s+/g, '').replace(/\.00$/, '');
  return limpio || null;
}

function parsearSeleccion(html, origenHost) {
  const bloques = html.split('<div class="col-lg-4 col-md-6 col-sm-12">').slice(1);
  const propiedades = [];
  for (const bloque of bloques) {
    const linkM = bloque.match(/href="(\/show\/[^"?]+)/);
    if (!linkM) continue;
    const linkPath = linkM[1];
    const idExternoM = linkPath.match(/\/show\/\d+\/(\d+)/);
    const fotoM = bloque.match(/data-src="([^"]+)"/);
    const tituloM = bloque.match(/class="text-capitalize">\s*<a[^>]*>([^<]+)<\/a>/);
    const precioM = bloque.match(/class="price">([^<]+)<\/h6>/);
    const habM = bloque.match(/icon-bed"><\/i>[\s\S]{0,150}?class="fw-6">(\d+)</);
    const banM = bloque.match(/icon-bath"><\/i>[\s\S]{0,150}?class="fw-6">(\d+)</);
    const ubicacionM = bloque.match(/<\/svg>\s*([^<]+?)\s*<\/div>/);
    const tagsM = [...bloque.matchAll(/class="flag-tag[^"]*">\s*([\s\S]*?)\s*<\/li>/g)].map((m) => decodificarEntidades(m[1]).toLowerCase());
    const tipoContratoTag = tagsM.find((t) => t.includes('sale') || t.includes('rent')) || '';
    const tipoPropiedadTag = tagsM.find((t) => t !== tipoContratoTag) || '';

    if (!idExternoM || !tituloM) continue;

    propiedades.push({
      titulo: decodificarEntidades(tituloM[1]),
      precio: limpiarPrecio(precioM ? precioM[1] : null),
      ubicacion: ubicacionM ? decodificarEntidades(ubicacionM[1]) : null,
      habitaciones: habM ? habM[1] : null,
      banos: banM ? banM[1] : null,
      foto: fotoM ? fotoM[1] : null,
      link_referencia: `https://${origenHost}${linkPath}`,
      id_externo: idExternoM[1],
      tipo_contrato: tipoContratoTag.includes('rent') ? 'alquiler' : 'venta',
      tipo_propiedad_detalle: MAPA_TIPO_PROPIEDAD[tipoPropiedadTag] || null,
      categoria: categoriaDesdeTipo(tipoPropiedadTag),
    });
  }
  return propiedades;
}

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
    res.status(400).json({ error: 'Ese link no es una selección de RE/MAX Connect. Pegá el link que empieza con share.remax-ccamls.com/s/...' });
    return;
  }

  try {
    const r = await fetch(url.href, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!r.ok) {
      res.status(502).json({ error: 'La selección respondió ' + r.status + '. Verificá que el link sea correcto y siga público.' });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) {
      res.status(502).json({ error: 'La selección devolvió una página vacía.' });
      return;
    }
    if (buf.length > MAX_BYTES) {
      res.status(413).json({ error: 'La página de la selección es demasiado grande.' });
      return;
    }

    const html = buf.toString('utf8');
    const propiedades = parsearSeleccion(html, url.hostname);
    if (!propiedades.length) {
      res.status(502).json({ error: 'No se encontró ninguna propiedad en esa selección. Verificá el link.' });
      return;
    }

    res.status(200).json({ propiedades });
  } catch (err) {
    console.error('traer-seleccion:', err);
    res.status(500).json({ error: 'No se pudo traer la selección: ' + err.message });
  }
}
