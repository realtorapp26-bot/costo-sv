// ============================================================
//  Costo SV — Traer una selección completa de RE/MAX Connect
//  Ruta: POST /api/traer-seleccion   body: { url }
//
//  Las "selecciones" (share.remax-ccamls.com/s/<codigo>) son una página
//  con varias propiedades juntas (foto, título, precio, ubicación,
//  cuartos/baños y su propio link). El servidor visita el link, parsea
//  cada tarjeta con expresiones regulares (la plantilla del portal es
//  consistente) y trae de la página individual de cada una su descripción
//  y todas sus fotos. La descripción se pasa por Claude para traducirla
//  (algunos listados vienen en inglés) y pulirla como copy de venta —
//  mismo patrón que api/extraer-datos.js.
//  Mismo allowlist de host que api/traer-html.js, por la misma razón
//  (no quedar como proxy abierto / SSRF).
// ============================================================

const HOSTS_PERMITIDOS = [/(^|\.)remax-ccamls\.com$/i];
const MAX_BYTES = 5 * 1024 * 1024;

const PRECIO_INPUT_POR_TOKEN = 1 / 1_000_000;
const PRECIO_OUTPUT_POR_TOKEN = 5 / 1_000_000;
const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const SUPA_KEY = 'sb_publishable_EWNNEWfk4DjuIGwkrbtx4g_PFMtzhSv';

async function registrarUsoIa(inputTokens, outputTokens) {
  const costo = inputTokens * PRECIO_INPUT_POR_TOKEN + outputTokens * PRECIO_OUTPUT_POR_TOKEN;
  try {
    await fetch(`${SUPA_URL}/rest/v1/uso_ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'return=minimal' },
      body: JSON.stringify({ input_tokens: inputTokens, output_tokens: outputTokens, costo_estimado: costo }),
    });
  } catch (e) {
    console.error('traer-seleccion registrarUsoIa:', e);
  }
}

// Traduce (si hace falta) y pule la descripción cruda como copy de venta en
// español -- mismo criterio que api/extraer-datos.js: no inventar datos,
// nunca mencionar al agente/oficina original, texto plano sin markdown.
async function generarCopyVenta(propiedad) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !propiedad.descripcion_original) return null;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: 'Recibís la descripción cruda de un listado inmobiliario (puede venir en inglés u otro idioma) ' +
          'junto a sus datos básicos. Devolvé ÚNICAMENTE el texto de venta final en español: 3-5 oraciones, ' +
          'persuasivo y profesional, con una llamada a la acción al final. Si la descripción ya viene en español, ' +
          'igual reformulala para que se lea mejor. Respetá siempre los datos reales (precio, ubicación, ' +
          'características) sin inventar nada. Nunca incluyas nombre de agente, oficina, email o teléfono aunque ' +
          'aparezcan en el texto original. Texto plano, sin emojis, sin markdown, sin comillas envolviendo la respuesta.',
        messages: [{
          role: 'user',
          content: `Título: ${propiedad.titulo}\nPrecio: ${propiedad.precio || 'a consultar'}\nUbicación: ${propiedad.ubicacion || ''}\nHabitaciones: ${propiedad.habitaciones || ''}\nBaños: ${propiedad.banos || ''}\n\nDescripción original:\n${propiedad.descripcion_original.slice(0, 4000)}`,
        }],
      }),
    });
    if (!resp.ok) {
      console.error('generarCopyVenta:', propiedad.id_externo, resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    if (data.usage) await registrarUsoIa(data.usage.input_tokens || 0, data.usage.output_tokens || 0);
    return (data.content?.[0]?.text || '').trim() || null;
  } catch (e) {
    console.error('generarCopyVenta:', propiedad.id_externo, e.message);
    return null;
  }
}

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

// Los textos de RE/MAX vienen con entidades duplicadas (ej. "&amp;ntilde;"
// en vez de "&ntilde;" directo) porque su HTML ya las había escapado una
// vez antes de meterlas en el bloque JSON-LD. Se decodifica &amp; primero
// para "pelar" esa capa, y recién ahí las entidades con nombre (tildes,
// ñ, nbsp) quedan como para decodificar normal.
const ENTIDADES_CON_NOMBRE = {
  nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', iexcl: '¡', iquest: '¿',
  ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

function decodificarEntidades(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&(nbsp|[aeiouAEIOU]acute|[nN]tilde|[uU]uml|iexcl|iquest|ndash|mdash|hellip|[lr]squo|[lr]dquo);/g, (_, nombre) => ENTIDADES_CON_NOMBRE[nombre] || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function limpiarPrecio(precio) {
  if (!precio) return null;
  const limpio = decodificarEntidades(precio).replace(/\s+/g, '').replace(/\.00$/, '');
  return limpio || null;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
// Se busca dentro de src="..."/href="..." (no en texto libre) porque algunos
// nombres de archivo de RE/MAX traen espacios sin codificar (ej. "Foto ataco
// 1.jpg") -- un regex de texto libre corta la URL en el espacio y la pierde.
// Entre comillas se puede permitir el espacio y luego codificarlo a mano.
const REGEX_FOTOS = /(?:src|href)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/gi;

// Quita etiquetas HTML de los campos "publicremarks_*" (vienen con <p>/<br>
// para formatear el texto en la página original) y las convierte en saltos
// de línea, antes de decodificar entidades.
function textoDesdeHtml(s) {
  if (!s) return null;
  const texto = String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '');
  const limpio = decodificarEntidades(texto);
  return limpio || null;
}

// Cada página individual trae, además del bloque JSON-LD, un objeto JS
// `var information = {...}` con los datos crudos del listado tal cual están
// en RE/MAX Connect: coordenadas, m² de lote/construcción y la descripción
// ya en español (publicremarks_es) además de inglés (publicremarks_en). Es
// JSON válido de verdad (lo arma el propio servidor, no un agente tipeando
// texto libre), así que acá sí conviene JSON.parse en vez de regex.
function datosDesdeInformation(html) {
  const m = html.match(/var information = (\{[\s\S]*?\});/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
}

function areaConUnidad(valor, unidadEtiqueta) {
  const n = parseFloat(valor);
  if (!n) return null;
  const unidad = /mt/i.test(unidadEtiqueta || '') ? 'm²' : (unidadEtiqueta || '').replace(/<[^>]+>/g, '');
  return `${n} ${unidad}`.trim();
}

// La tarjeta de la selección solo trae título/precio/ubicación/cuartos y
// UNA foto — la descripción completa, las fotos, la ubicación exacta y el
// resto de las medidas viven en la página propia de cada propiedad (mismo
// link que ya sacamos arriba). Se visita cada una en paralelo; si alguna
// falla, esa propiedad se queda solo con lo que ya traía la selección (no
// se cae el resto del lote).
async function enriquecerConPaginaIndividual(propiedad) {
  try {
    const r = await fetch(propiedad.link_referencia, {
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    });
    if (!r.ok) return propiedad;
    const html = await r.text();

    const info = datosDesdeInformation(html);

    let descripcion = null;
    if (info) {
      descripcion = textoDesdeHtml(info.publicremarks_es) || textoDesdeHtml(info.publicremarks_en);
    }
    if (!descripcion) {
      // Respaldo: el bloque JSON-LD, sin JSON.parse porque cuando la
      // descripción tiene saltos de línea reales (alguien los tipeó en
      // RE/MAX Connect) deja de ser JSON válido y JSON.parse tira.
      const descM = html.match(/"description":\s*"([\s\S]*?)",\s*\n?\s*"[a-zA-Z_]+"\s*:/);
      descripcion = descM ? decodificarEntidades(descM[1]) : null;
    }

    const fotos = [...new Set([...html.matchAll(REGEX_FOTOS)].map((m) => m[1].replace(/ /g, '%20')))]
      .filter((u) => !/logo|favicon|icon|avatar|userfiles|profile/i.test(u));

    const enriquecida = {
      ...propiedad,
      descripcion_original: descripcion,
      fotos: fotos.length ? fotos : (propiedad.foto ? [propiedad.foto] : []),
      latitud: info && info.latitude ? parseFloat(info.latitude) || null : null,
      longitud: info && info.longitude ? parseFloat(info.longitude) || null : null,
      tamano_lote: info ? areaConUnidad(info.lotsizearea, info.lotsizeUnit_es) : null,
      tamano_construccion: info ? areaConUnidad(info.constructionsize, info.constructionsizeunit) : null,
    };
    enriquecida.copy_venta = await generarCopyVenta(enriquecida);
    return enriquecida;
  } catch (e) {
    console.error('enriquecerConPaginaIndividual:', propiedad.id_externo, e.message);
    return propiedad;
  }
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
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
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
    const propiedadesBase = parsearSeleccion(html, url.hostname);
    if (!propiedadesBase.length) {
      res.status(502).json({ error: 'No se encontró ninguna propiedad en esa selección. Verificá el link.' });
      return;
    }

    const propiedades = await Promise.all(propiedadesBase.map(enriquecerConPaginaIndividual));

    res.status(200).json({ propiedades });
  } catch (err) {
    console.error('traer-seleccion:', err);
    res.status(500).json({ error: 'No se pudo traer la selección: ' + err.message });
  }
}
