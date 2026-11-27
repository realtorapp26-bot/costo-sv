// ============================================================
//  Costo SV — Página por propiedad (render en el servidor)
//  Ruta: /propiedad/<slug>  ->  vercel.json reescribe a /api/propiedad?slug=<slug>
//
//  Devuelve HTML completo con:
//   - <title>, meta description y og:/twitter propias (foto, precio, ubicación)
//   - JSON-LD (RealEstateListing + oferta + breadcrumb)
//   - Meta Pixel con PageView y ViewContent (content_type home_listing)
//   - Layout de ficha: galería, características, descripción, CTA de WhatsApp
//
//  Credenciales Supabase: son las "publishable" (mismas que config.js y
//  api/generar-copy.js) — públicas por diseño, solo permiten leer lo publicado.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const SUPA_KEY = 'sb_publishable_EWNNEWfk4DjuIGwkrbtx4g_PFMtzhSv';
const SITE_URL = 'https://guerrero-properties.com';
const WHATSAPP_NUMBER = '50370381941';
const PIXEL_ID = '1592044346046889';
const AGENTE = {
  nombre: 'Walter Guerrero',
  titulo: 'Asociado · RE/MAX Elite',
  telefono: '+503 7038-1941',
  email: 'walter.guerrero@remax.com.sv',
  foto: '/assets/walter-guerrero-retocada.png',
};
import { precioFmt, areaFmt } from '../lib/formato.js';

const FOTO_RESPALDO = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';

// El precio se carga a mano desde el panel, así que llega como venga:
// "125000", "$125000", "US$ 129,900" o "Consultar". Si es un número suelto se
// le ponen los separadores de miles — "$125000" se lee descuidado justo en la
// página que recibe el 80% del tráfico. Cualquier otro texto se respeta.
function precioLegible(valor, tipoContrato) {
  const txt = String(valor == null ? '' : valor).trim();
  if (!txt) return 'Consultar';
  return precioFmt(txt, tipoContrato);
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Las fotos vienen del CDN de RE/MAX o de Supabase Storage a su tamaño
// original (algunas pesan varios MB) -- se reescriben para pasar por el
// optimizador de imágenes de Vercel (ver "images" en vercel.json).
//
// Vercel solo acepta anchos "w" que estén en la lista "sizes" de
// vercel.json -- cualquier otro valor responde 400 y la imagen no carga.
// Por eso se redondea siempre hacia arriba al tamaño permitido más
// cercano, en vez de pasar el ancho pedido tal cual.
const HOSTS_OPTIMIZABLES = /remaxcaribbeanandcentralamerica\.azureedge\.net|iseoyfiteeobzvtfjhoe\.supabase\.co/i;
const IMG_OPT_TAMANOS = [160, 280, 400, 600, 800, 1080, 1600, 1920];
const imgOptTamano = (w) => IMG_OPT_TAMANOS.find((t) => t >= (w || 800)) || IMG_OPT_TAMANOS[IMG_OPT_TAMANOS.length - 1];
const imgOpt = (url, w, q) => {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return url;
  if (!HOSTS_OPTIMIZABLES.test(url)) return url;
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${imgOptTamano(w)}&q=${q || 75}`;
};

const precioNumero = (p) => {
  const n = Number(String(precioFmt(p)).replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// "2026-09-03" -> "3 de septiembre de 2026". El mediodía evita que la zona
// horaria corra la fecha un día hacia atrás.
const fmtFecha = (d) => {
  if (!d) return null;
  const f = new Date(String(d) + 'T12:00:00');
  return Number.isNaN(f.getTime()) ? null : f.toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Extrae el ID de 11 caracteres de un video de YouTube en cualquiera de sus
// formatos (watch?v=, youtu.be/, embed/, shorts/, live/). Devuelve null si la
// URL no es un video (p. ej. el link a un canal) — en ese caso se deja como enlace.
const youtubeId = (u) => {
  if (!u) return null;
  const m = String(u).trim().match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
};

async function buscarPropiedad(valor) {
  const base = `${SUPA_URL}/rest/v1/propiedades`;
  const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };
  const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

  // 1) Intento por slug (columna nueva). Si aún no existe, PostgREST responde 400.
  try {
    const q = `select=*&publicada=eq.true&limit=1&slug=eq.${encodeURIComponent(valor)}`;
    const res = await fetch(`${base}?${q}`, { headers });
    if (res.ok) {
      const filas = await res.json();
      if (filas.length) return filas[0];
    }
  } catch (_) { /* sigue al fallback */ }

  // 2) Fallback por id (sirve mientras no haya slugs o si el slug no matchea)
  if (esUuid) {
    const q = `select=*&publicada=eq.true&limit=1&id=eq.${encodeURIComponent(valor)}`;
    const res = await fetch(`${base}?${q}`, { headers });
    if (res.ok) {
      const filas = await res.json();
      if (filas.length) return filas[0];
    }
  }
  return null;
}

// Palabras que aparecen en casi todos los slugs y no dicen nada de lo que la
// persona buscaba. Sin sacarlas, "casa-en-venta-en-zaragoza" haría coincidir
// con media base por culpa de "casa" y "venta".
const VACIAS = new Set([
  'en', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'por', 'para', 'a',
  'venta', 'vende', 'alquiler', 'alquila', 'renta', 'se', 'un', 'una', 'su',
  'sale', 'for', 'rent', 'the', 'in', 'of', 'and',
]);

// Lo que la persona buscaba está en la propia dirección: /propiedad/
// rancho-santorini le llegó a alguien que buscaba un rancho. Esto saca de ahí
// las palabras útiles y si venía por un alquiler o por una compra.
function pistasDelSlug(slug) {
  const limpio = String(slug || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const todas = limpio.split(' ').filter(Boolean);
  const contrato = /\b(alquiler|alquila|renta|rent)\b/.test(limpio)
    ? 'alquiler'
    : (/\b(venta|vende|sale)\b/.test(limpio) ? 'venta' : null);
  // Se descartan las de una o dos letras: suelen ser restos de medidas ("v", "m2").
  const claves = todas.filter((p) => !VACIAS.has(p) && p.length > 2 && !/^\d+$/.test(p));
  return { claves, contrato, frase: claves.join(' ') };
}

// Puntúa cada propiedad publicada por cuántas de esas palabras aparecen en su
// título o ubicación. Las de ubicación valen doble: que coincida la zona es
// mucho mejor señal que que coincida "apartamento".
function parecidas(lista, pistas, cuantas) {
  const norm = (s) => String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  const puntuadas = lista.map((p) => {
    const titulo = norm(p.titulo);
    const lugar = norm(p.ubicacion) + ' ' + norm(p.tipo_propiedad_detalle);
    let puntos = 0;
    for (const k of pistas.claves) {
      if (lugar.includes(k)) puntos += 2;
      else if (titulo.includes(k)) puntos += 1;
    }
    if (pistas.contrato && p.tipo_contrato === pistas.contrato) puntos += 1;
    return { p, puntos };
  });
  const conAlgo = puntuadas.filter((x) => x.puntos > 0).sort((a, b) => b.puntos - a.puntos);
  // Primero las que coinciden, y si no llegan a tres se completa con el resto:
  // una sola tarjeta se ve peor que tres, y "rancho santorini" solo coincide
  // con una. El resto ya viene ordenado por captación propia y por más
  // reciente, así que rellenar con las primeras es rellenar con lo mejor.
  const elegidas = conAlgo.slice(0, cuantas);
  if (elegidas.length < cuantas) {
    const yaEstan = new Set(elegidas.map((x) => x.p.id));
    // El relleno no puede ser cualquiera: a quien buscaba un rancho de playa
    // no le sirve un local comercial. Se completa primero con la misma
    // categoría que la mejor coincidencia (o el mismo tipo de contrato si no
    // hubo ninguna), y solo después con el resto.
    const refCat = elegidas.length ? elegidas[0].p.categoria : null;
    const afin = (x) => (refCat ? x.p.categoria === refCat
      : (pistas.contrato ? x.p.tipo_contrato === pistas.contrato : false));
    for (const grupo of [puntuadas.filter(afin), puntuadas]) {
      for (const x of grupo) {
        if (elegidas.length >= cuantas) break;
        if (!yaEstan.has(x.p.id)) { elegidas.push(x); yaEstan.add(x.p.id); }
      }
    }
  }
  return { items: elegidas.map((x) => x.p), huboCoincidencia: conAlgo.length > 0 };
}

async function traerPublicadas() {
  try {
    const q = 'select=id,slug,titulo,precio,tipo_contrato,categoria,ubicacion,'
      + 'habitaciones,banos,m2,fotos,tipo_propiedad_detalle'
      + '&publicada=eq.true&order=captacion_propia.desc,created_at.desc&limit=80';
    const res = await fetch(`${SUPA_URL}/rest/v1/propiedades?${q}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (_) {
    return [];
  }
}

// Página de propiedad dada de baja. Sigue devolviendo 404 a propósito: así
// Google la va sacando de su índice en vez de tratarla como un "404
// encubierto", que es lo que pasaría si se redirigiera al catálogo. Lo que
// cambia es lo que ve la PERSONA: antes era un enlace suelto y un callejón sin
// salida. Search Console mostró que 5 de 16 clics del sitio caían acá.
function paginaNoEncontrada(slug, sugeridas, pistas) {
  const lista = sugeridas || [];
  const buscaba = pistas && pistas.claves.length
    ? pistas.claves.slice(0, 4).join(' ')
    : '';

  const tarjetas = lista.map((p) => {
    const foto = (p.fotos && p.fotos[0]) || '';
    const ficha = `/propiedad/${encodeURIComponent(p.slug || p.id)}`;
    const meta = [
      p.habitaciones ? `${esc(p.habitaciones)} hab` : '',
      p.banos ? `${esc(p.banos)} baños` : '',
      p.m2 ? esc(areaFmt(p.m2)) : '',
    ].filter(Boolean).join(' · ');
    return `<a href="${ficha}" class="nd-card">
      ${foto ? `<img src="${esc(imgOpt(foto, 400, 65))}" alt="${esc(p.titulo)}" loading="lazy" decoding="async">` : '<div class="nd-sinfoto"></div>'}
      <div class="nd-card-txt">
        <h3>${esc(p.titulo)}</h3>
        ${p.ubicacion ? `<p class="nd-lugar">${esc(p.ubicacion)}</p>` : ''}
        ${meta ? `<p class="nd-meta">${meta}</p>` : ''}
        <p class="nd-precio">${esc(precioLegible(p.precio, p.tipo_contrato))}</p>
      </div>
    </a>`;
  }).join('');

  const waTxt = buscaba
    ? `Hola Walter, estaba viendo "${buscaba}" en tu sitio y ya no está disponible. ¿Tenés algo parecido?`
    : 'Hola Walter, vi una propiedad en tu sitio que ya no está disponible. ¿Tenés algo parecido?';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Propiedad no disponible | Walter Guerrero RE/MAX Elite</title>
<link rel="stylesheet" href="/styles.css"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  .nd-wrap { max-width: 1100px; margin: 0 auto; padding: 90px 20px 70px; }
  .nd-head { text-align: center; max-width: 640px; margin: 0 auto 50px; }
  .nd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
  .nd-card { display: block; background: #fff; border: 1px solid var(--border); border-radius: 12px;
             overflow: hidden; text-decoration: none; color: inherit; transition: var(--transition); }
  .nd-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
  .nd-card img, .nd-sinfoto { width: 100%; height: 170px; object-fit: cover; display: block; background: var(--bg-alt); }
  .nd-card-txt { padding: 16px 18px 20px; }
  .nd-card-txt h3 { font-size: 1rem; line-height: 1.35; margin: 0 0 8px; }
  .nd-lugar, .nd-meta { margin: 0 0 6px; font-size: 0.85rem; color: var(--text-light); }
  .nd-precio { margin: 10px 0 0; font-weight: 700; color: var(--primary); font-size: 1.1rem; }
  .nd-acciones { text-align: center; margin-top: 46px; display: flex; flex-wrap: wrap;
                 gap: 14px; justify-content: center; }
</style>
</head><body>
<div class="nd-wrap">
  <div class="nd-head">
    <h1 class="hero-title-sm">Esta propiedad ya no está disponible</h1>
    <p class="section-subtitle">Puede que se haya vendido o retirado del inventario. ${lista.length ? 'Estas sí están disponibles ahora:' : ''}</p>
  </div>
  ${lista.length ? `<div class="nd-grid">${tarjetas}</div>` : ''}
  <div class="nd-acciones">
    <a href="/propiedades.html" class="btn btn-gold">Ver todas las propiedades</a>
    <a data-whatsapp data-wa="${esc(waTxt)}" href="#" class="btn btn-whatsapp">
      <i class="fab fa-whatsapp" aria-hidden="true"></i> Decime qué buscás
    </a>
  </div>
</div>
<script src="/config.js"></script>
<script src="/app.js"></script>
</body></html>`;
}

function render(p) {
  const slug = p.slug || p.id;
  const fotos = Array.isArray(p.fotos) && p.fotos.length ? p.fotos : [FOTO_RESPALDO];
  const foto0 = fotos[0];
  // La foto principal es el LCP de la página. Antes se servía un solo archivo
  // de 1080px a todo el mundo: en un celular de 390px eso es casi el triple
  // de píxeles de los necesarios (164 KB en webp contra ~55 KB a 600px). Con
  // srcset cada aparato baja el tamaño que le toca.
  // Ojo: imgOpt() solo reescribe las URLs de los hosts optimizables; si la
  // foto viene de otro lado devuelve la misma URL, y entonces un srcset con
  // varios anchos sería una mentira (el mismo archivo declarado como cuatro
  // tamaños). Por eso el srcset solo se arma cuando la URL sí se optimiza.
  const heroOptimizable = imgOpt(foto0, 1080, 75) !== foto0;
  const HERO_SIZES = '(max-width: 900px) 100vw, 740px';
  const heroSrcset = heroOptimizable
    ? [400, 600, 800, 1080].map((w) => `${imgOpt(foto0, w, 75)} ${w}w`).join(', ')
    : foto0;
  const url = `${SITE_URL}/propiedad/${slug}`;
  const precioN = precioNumero(p.precio);
  const contrato = p.tipo_contrato === 'alquiler' ? 'Alquiler' : 'Venta';

  const descripcion = (p.copy_venta || p.descripcion_original || '').trim();
  const recorte = (t, n) => {
    const s = String(t).replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    const corte = s.slice(0, n);
    return corte.slice(0, corte.lastIndexOf(' ') > 0 ? corte.lastIndexOf(' ') : n).trim() + '…';
  };
  const metaDesc = descripcion
    ? recorte(descripcion, 158)
    : recorte(`${p.titulo} en ${contrato.toLowerCase()}${p.ubicacion ? ' — ' + p.ubicacion : ''}. ${precioLegible(p.precio, p.tipo_contrato)}. Contactá a Walter Guerrero, RE/MAX Elite.`, 158);

  const chips = [
    p.habitaciones ? `<span><i class="fas fa-bed"></i> ${esc(p.habitaciones)} hab</span>` : '',
    p.banos ? `<span><i class="fas fa-bath"></i> ${esc(p.banos)} baños</span>` : '',
    p.m2 ? `<span><i class="fas fa-vector-square"></i> ${esc(areaFmt(p.m2))}</span>` : '',
    p.tamano_lote ? `<span><i class="fas fa-ruler-combined"></i> Lote ${esc(areaFmt(p.tamano_lote))}</span>` : '',
    p.tamano_construccion ? `<span><i class="fas fa-drafting-compass"></i> Construcción ${esc(areaFmt(p.tamano_construccion))}</span>` : '',
    fmtFecha(p.fecha_publicacion) ? `<span><i class="fas fa-calendar-day"></i> Publicado: ${esc(fmtFecha(p.fecha_publicacion))}</span>` : '',
  ].filter(Boolean).join('');

  const features = [
    p.propiedad_nueva ? 'Propiedad nueva' : '',
    p.garage ? 'Garaje' : '',
    p.comunidad_cerrada ? 'Comunidad cerrada' : '',
    p.hoa ? 'Cuota de mantenimiento (HOA)' : '',
    p.tipo_propiedad_detalle ? esc(p.tipo_propiedad_detalle) : '',
  ].filter(Boolean);
  const featuresHtml = features.length
    ? `<ul class="ficha-features">${features.map((f) => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')}</ul>`
    : '';

  const ytId = youtubeId(p.video_url);
  const videoHtml = ytId ? `<div class="ficha-seccion">
                    <h2>Video de la propiedad</h2>
                    <div class="ficha-video">
                        <button type="button" class="yt-facade" data-yt="${esc(ytId)}" onclick="cargarYt(this)"
                                style="background-image:url('https://i.ytimg.com/vi/${esc(ytId)}/hqdefault.jpg')"
                                aria-label="Reproducir el video de ${esc(p.titulo)}">
                            <span class="yt-play"><i class="fas fa-play"></i></span>
                        </button>
                    </div>
                </div>` : '';

  const tieneMapa = p.latitud != null && p.longitud != null;
  const mapaHtml = tieneMapa ? `<div class="ficha-seccion">
                    <h2>Ubicación</h2>
                    <div class="ficha-mapa">
                        <iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen
                                src="https://www.google.com/maps?q=${encodeURIComponent(p.latitud + ',' + p.longitud)}&z=16&output=embed"
                                title="Ubicación de ${esc(p.titulo)}"></iframe>
                    </div>
                    <a class="ficha-mapa-link" href="https://www.google.com/maps/search/?api=1&query=${p.latitud},${p.longitud}" target="_blank" rel="noopener"><i class="fas fa-map-location-dot"></i> Abrir en Google Maps</a>
                </div>` : '';
  const enlacesExtra = [
    p.tour_virtual_url ? `<a href="${esc(p.tour_virtual_url)}" target="_blank" rel="noopener"><i class="fas fa-vr-cardboard"></i> Tour virtual 360°</a>` : '',
    (p.video_url && !ytId) ? `<a href="${esc(p.video_url)}" target="_blank" rel="noopener"><i class="fas fa-play-circle"></i> Video de la propiedad</a>` : '',
  ].filter(Boolean).join('');

  const waMsg = `Hola Walter, me interesa "${p.titulo}" (${precioLegible(p.precio, p.tipo_contrato)}) que vi en ${url}. ¿Me das más información?`;
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  const galeriaThumbs = fotos.length > 1
    // Las miniaturas se MUESTRAN a 96x68 px (ver .ficha-thumb abajo) pero se
    // pedían a 300 px de ancho, que el optimizador redondea a 400: 23 KB cada
    // una, 253 KB sólo de miniaturas en una ficha de 11 fotos, más que la foto
    // principal. Con srcset una pantalla normal baja la de 160 (4 KB) y una
    // retina la de 280 (12 KB), que es lo que de verdad necesita cada una.
    ? `<div class="ficha-thumbs">${fotos.map((f, i) => {
      const thumbOpt = imgOpt(f, 160, 65) !== f;
      const srcset = thumbOpt ? ` srcset="${esc([160, 280].map((w) => `${imgOpt(f, w, 65)} ${w}w`).join(', '))}" sizes="96px"` : '';
      return `<button type="button" class="ficha-thumb${i === 0 ? ' activo' : ''}" onclick="verFoto(${i})"><img src="${esc(imgOpt(f, 280, 65))}"${srcset} alt="${esc(p.titulo)} — foto ${i + 1}" loading="lazy" decoding="async"></button>`;
    }).join('')}</div>`
    : '';

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Product', 'Residence'],
        name: p.titulo,
        description: descripcion || metaDesc,
        image: fotos,
        url,
        ...(p.fecha_publicacion ? { datePosted: p.fecha_publicacion } : {}),
        ...(p.ubicacion ? { address: { '@type': 'PostalAddress', addressLocality: p.ubicacion, addressCountry: 'SV' } } : {}),
        ...(precioN ? { offers: { '@type': 'Offer', price: precioN, priceCurrency: 'USD', availability: 'https://schema.org/InStock', url, seller: { '@type': 'RealEstateAgent', name: 'Walter Guerrero — RE/MAX Elite' } } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/index.html` },
          { '@type': 'ListItem', position: 2, name: 'Propiedades', item: `${SITE_URL}/propiedades.html` },
          { '@type': 'ListItem', position: 3, name: p.titulo, item: url },
        ],
      },
    ],
  };

  const viewContentParams = {
    content_type: 'home_listing',
    content_ids: [p.id],
    content_name: p.titulo,
    ...(precioN ? { value: precioN, currency: 'USD' } : {}),
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Meta Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${PIXEL_ID}');
    fbq('track', 'PageView');
    fbq('track', 'ViewContent', ${JSON.stringify(viewContentParams)});
    </script>
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel Code -->
    <title>${esc(p.titulo)} — ${esc(p.precio ? precioLegible(p.precio, p.tipo_contrato) : contrato)} | Walter Guerrero RE/MAX Elite</title>
    <meta name="description" content="${esc(metaDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${esc(url)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Walter Guerrero · RE/MAX Elite">
    <meta property="og:locale" content="es_SV">
    <meta property="og:title" content="${esc(p.titulo)} — ${esc(p.precio ? precioLegible(p.precio, p.tipo_contrato) : '')}">
    <meta property="og:description" content="${esc(metaDesc)}">
    <meta property="og:url" content="${esc(url)}">
    <meta property="og:image" content="${esc(foto0)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(p.titulo)} — ${esc(p.precio ? precioLegible(p.precio, p.tipo_contrato) : '')}">
    <meta name="twitter:description" content="${esc(metaDesc)}">
    <meta name="twitter:image" content="${esc(foto0)}">
    <meta name="theme-color" content="#0f172a">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/favicon.svg">
    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <!-- La foto principal es el elemento LCP de esta página (el 80% del
         tráfico del sitio entra acá). Sin este preload el navegador la
         descubre recién después de parsear las tres hojas de estilo, y
         PageSpeed lo marca como "descubrimiento tardío de la solicitud LCP".
         El imagesrcset/imagesizes tiene que ser IDÉNTICO al del <img> de
         abajo, si no el navegador baja la imagen dos veces. -->
    <link rel="preload" as="image" fetchpriority="high"
          imagesrcset="${esc(heroSrcset)}" imagesizes="${HERO_SIZES}">
    <link rel="preconnect" href="https://remaxcaribbeanandcentralamerica.azureedge.net">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap">
    <link rel="stylesheet" href="/styles.css">
    <!-- Font Awesome son 102 KB de CSS para 20 iconos, y bloqueaba el render
         de todo lo demás. Con media="print" el navegador lo baja sin esperar
         a aplicarlo, y el onload lo activa ya pintada la página. El <noscript>
         cubre a quien tenga el JS apagado. -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          media="print" onload="this.media='all';this.onload=null">
    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>
    <style>
        .ficha-wrap { max-width: 1180px; margin: 0 auto; padding: 40px 24px 80px; }
        .ficha-volver { display: inline-flex; align-items: center; gap: 8px; color: var(--text-light); text-decoration: none; font-size: 0.9rem; margin-bottom: 24px; }
        .ficha-volver:hover { color: var(--primary); }
        .ficha-hero-img { width: 100%; aspect-ratio: 16 / 10; object-fit: contain; border-radius: var(--radius-md); cursor: zoom-in; background: var(--bg-alt); }
        .ficha-thumbs { display: flex; gap: 10px; margin-top: 12px; overflow-x: auto; padding-bottom: 4px; }
        .ficha-thumb { flex: 0 0 96px; height: 68px; border: 2px solid transparent; border-radius: 8px; overflow: hidden; padding: 0; cursor: pointer; background: none; }
        .ficha-thumb.activo { border-color: var(--gold); }
        .ficha-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ficha-layout { display: flex; gap: 48px; margin-top: 36px; align-items: flex-start; }
        .ficha-main { flex: 1 1 auto; min-width: 0; }
        .ficha-aside { flex: 0 0 320px; position: sticky; top: 100px; background: var(--bg-alt); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 26px; box-shadow: var(--shadow-md); }
        .ficha-badge { display: inline-block; background: var(--primary); color: #fff; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; margin-bottom: 14px; }
        .ficha-titulo { font-family: 'Playfair Display', serif; font-size: 2.2rem; color: var(--primary); line-height: 1.2; margin: 0 0 10px; }
        .ficha-ubicacion { color: var(--text-light); margin: 0 0 22px; }
        .ficha-ubicacion i { color: var(--gold); margin-right: 6px; }
        .ficha-chips { display: flex; flex-wrap: wrap; gap: 18px; padding: 18px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); color: var(--text-main); font-weight: 500; }
        .ficha-chips i { color: var(--gold); margin-right: 6px; }
        .ficha-seccion { margin-top: 32px; }
        .ficha-seccion h2 { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: var(--primary); margin: 0 0 14px; }
        .ficha-desc { color: var(--text-main); line-height: 1.75; white-space: pre-line; }
        .ficha-features { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
        .ficha-features i { color: #1b8a4b; margin-right: 8px; }
        .ficha-enlaces { display: flex; flex-direction: column; gap: 12px; margin-top: 18px; }
        .ficha-enlaces a { color: var(--primary); text-decoration: none; font-weight: 500; }
        .ficha-enlaces a:hover { color: var(--gold); }
        .ficha-precio-label { color: var(--text-light); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; }
        .ficha-precio { font-family: 'Playfair Display', serif; font-size: 2rem; color: var(--primary); margin: 4px 0 20px; }
        .ficha-aside .btn { width: 100%; }
        .ficha-aside .aside-nota { font-size: 0.82rem; color: var(--text-light); margin-top: 14px; text-align: center; }
        .ficha-contacto { margin-top: 22px; padding-top: 22px; border-top: 1px solid var(--border); }
        .ficha-contacto-titulo { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--primary); }
        .ficha-contacto-bajada { font-size: 0.84rem; color: var(--text-light); line-height: 1.5; margin: 6px 0 16px; }
        .ficha-contacto .form-group { margin-bottom: 12px; }
        .ficha-contacto .form-group label { font-size: 0.82rem; }
        .ficha-contacto .form-control { padding: 11px 13px; font-size: 0.92rem; }
        .ficha-contacto .form-alert { font-size: 0.86rem; line-height: 1.45; }
        .ficha-encabezado { margin-top: 30px; }
        .ficha-extras { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); }
        .ficha-extras a, .ficha-extras button { background: none; border: 0; padding: 0; font: inherit; font-size: 0.82rem; color: var(--text-light); text-decoration: none; cursor: pointer; }
        .ficha-extras a:hover, .ficha-extras button:hover { color: var(--primary); text-decoration: underline; }
        .ficha-extras i { margin-right: 5px; }
        .ficha-mapa { position: relative; aspect-ratio: 16 / 9; border-radius: var(--radius-md); overflow: hidden; background: var(--border); }
        .ficha-mapa iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .ficha-mapa-link { display: inline-flex; align-items: center; gap: 8px; margin-top: 12px; color: var(--primary); text-decoration: none; font-weight: 500; }
        .ficha-mapa-link:hover { color: var(--gold); }
        .ficha-video { position: relative; aspect-ratio: 16 / 9; border-radius: var(--radius-md); overflow: hidden; background: #000; }
        .ficha-video iframe, .ficha-video .yt-facade { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .yt-facade { display: flex; align-items: center; justify-content: center; background-size: cover; background-position: center; cursor: pointer; padding: 0; }
        .yt-facade::after { content: ''; position: absolute; inset: 0; background: rgba(10, 15, 28, 0.28); transition: background 0.25s ease; }
        .yt-facade:hover::after { background: rgba(10, 15, 28, 0.12); }
        .yt-play { position: relative; z-index: 1; width: 66px; height: 66px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; padding-left: 4px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35); }
        @media (max-width: 880px) {
            .ficha-layout { flex-direction: column; }
            /* El precio y el formulario van ANTES de la descripción. Medido:
               en la ficha de Golden Lake quedaban a 2.173px de una página de
               3.754px — había que bajar más de la mitad para encontrar dónde
               dejar los datos. */
            .ficha-aside { position: static; width: 100%; flex-basis: auto; order: -1; }
            .ficha-titulo { font-size: 1.7rem; }
        }
    </style>
</head>
<body>
    <header class="navbar">
        <div class="container">
            <a href="/index.html" class="logo" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-decoration: none; margin-top: 5px;">
                <img decoding="async" src="/assets/logo-remax.png" alt="RE/MAX Logo" style="height: 35px; object-fit: contain;">
                <span style="color: white; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 500; letter-spacing: 0.5px; opacity: 0.9;">Walter Guerrero</span>
            </a>
            <button class="mobile-menu-btn" aria-label="Abrir el menú"><i class="fas fa-bars" aria-hidden="true"></i></button>
            <nav class="nav-links">
                <a href="/index.html">Inicio</a>
                <a href="/vender.html">Vender</a>
                <a href="/comprar.html">Comprar</a>
                <a href="/invertir.html">Invertir</a>
                <a href="/propiedades.html" class="active">Propiedades</a>
                <a href="/golden-lake.html">Golden Lake</a>
                <a href="/menajes.html">Menajes</a>
                <a href="/costo-vida.html">Costo de Vida</a>
                <a data-whatsapp href="#" class="btn btn-gold btn-whatsapp"><i class="fab fa-whatsapp"></i> Contactar</a>
            </nav>
        </div>
    </header>

    <div class="ficha-wrap">
        <a href="/propiedades.html#${esc(slug)}" class="ficha-volver"><i class="fas fa-arrow-left"></i> Volver al inventario</a>

        <img id="ficha-hero" class="ficha-hero-img" src="${esc(imgOpt(foto0, 1080, 75))}" srcset="${esc(heroSrcset)}" sizes="${HERO_SIZES}" fetchpriority="high" decoding="async" alt="${esc(p.titulo)}" onerror="this.removeAttribute('srcset');this.src='${FOTO_RESPALDO}'" onclick="abrirGaleria()">
        ${galeriaThumbs}

        <!-- El encabezado vive FUERA de las dos columnas. Así, en celular, el
             orden queda: foto -> qué es y dónde -> precio y contacto ->
             descripción. Antes el precio y el formulario caían al final de
             todo: había que pasar descripción, video, características y mapa
             para llegar a ellos, en la página que recibe el 80% del tráfico. -->
        <div class="ficha-encabezado">
            <span class="ficha-badge">${esc(p.categoria || 'Propiedad')} · ${contrato}</span>
            <h1 class="ficha-titulo">${esc(p.titulo)}</h1>
            ${p.ubicacion ? `<p class="ficha-ubicacion"><i class="fas fa-location-dot"></i>${esc(p.ubicacion)}</p>` : ''}
            ${chips ? `<div class="ficha-chips">${chips}</div>` : ''}
        </div>

        <div class="ficha-layout">
            <div class="ficha-main">

                ${descripcion ? `<div class="ficha-seccion"><h2>Descripción</h2><div class="ficha-desc">${esc(descripcion)}</div></div>` : ''}
                ${videoHtml}
                ${featuresHtml ? `<div class="ficha-seccion"><h2>Características</h2>${featuresHtml}</div>` : ''}
                ${mapaHtml}
                ${enlacesExtra ? `<div class="ficha-seccion"><h2>Más información</h2><div class="ficha-enlaces">${enlacesExtra}</div></div>` : ''}
            </div>

            <aside class="ficha-aside">
                <div class="ficha-precio-label">Precio</div>
                <div class="ficha-precio">${esc(precioLegible(p.precio, p.tipo_contrato))}</div>
                <a data-whatsapp data-wa="${esc(waMsg)}" href="${esc(waHref)}" class="btn btn-whatsapp"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</a>

                <!-- Captura de datos. Antes la ficha SOLO ofrecía WhatsApp: si la
                     persona no tocaba Enviar dentro de WhatsApp, el lead quedaba
                     sin nombre ni teléfono y no había forma de devolverle el
                     contacto. Acá pide lo mínimo (nombre + teléfono) para que
                     siempre quede un dato con el que llamar. La clase
                     webhook-form es la que app.js engancha para guardarlo. -->
                <div class="ficha-contacto">
                    <div class="ficha-contacto-titulo">¿Preferís que te contacte yo?</div>
                    <p class="ficha-contacto-bajada">Dejame tus datos y te escribo con la información completa de esta propiedad.</p>
                    <form class="webhook-form" action="" method="POST">
                        <input type="hidden" name="servicio" value="${esc(p.titulo)}">
                        <input type="hidden" name="tipo_propiedad" value="${esc(p.titulo)}">
                        <input type="hidden" name="pagina_origen" value="${esc(slug)}">
                        <div class="form-group">
                            <label>Nombre*</label>
                            <input type="text" name="nombre" class="form-control" required placeholder="Tu nombre">
                        </div>
                        <div class="form-group">
                            <label>WhatsApp o teléfono*</label>
                            <input type="tel" name="telefono" class="form-control" required placeholder="+503 ... o +1 ...">
                        </div>
                        <div class="form-group">
                            <label>Correo <span style="font-weight:400; color:var(--text-light);">(opcional)</span></label>
                            <input type="email" name="email" class="form-control" placeholder="tu@correo.com">
                        </div>
                        <button type="submit" class="btn btn-primary">Quiero que me contacten</button>
                    </form>
                </div>

                <!-- Secundarios. El dossier estaba arriba, ocupando el lugar
                     de honor bajo el precio, y en 30 días lo abrieron 4
                     personas de 3.459 visitas (0,1%): no se gana ese espacio.
                     Siguen disponibles, como enlaces y no como botones. -->
                <div class="ficha-extras">
                    <button type="button" onclick="window.abrirDossier && window.abrirDossier()"><i class="fas fa-file-arrow-down"></i> Dossier</button>
                    ${(Array.isArray(p.fotos) && p.fotos.length) ? `<a href="/api/fotos-zip?slug=${esc(slug)}"><i class="fas fa-download"></i> Fotos</a>` : ''}
                    <a href="/propiedades.html"><i class="fas fa-building"></i> Otras propiedades</a>
                </div>

                <p class="aside-nota">Atención directa de Walter Guerrero, agente RE/MAX Elite.</p>
            </aside>
        </div>
    </div>

    <footer>
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <h4>Walter Guerrero | RE/MAX Elite</h4>
                    <p style="color: #cbd5e1; max-width: 300px;">Agente inmobiliario profesional dedicado a tu éxito financiero a través de bienes raíces en El Salvador.</p>
                    <div class="footer-social">
                        <a class="yt" href="https://www.youtube.com/@WalterGuerreroSV" target="_blank" rel="noopener"><i class="fab fa-youtube"></i> YouTube</a>
                        <a class="ig" href="https://www.instagram.com/walter.guerrero_remax/" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Instagram</a>
                        <a class="fb" href="https://www.facebook.com/profile.php?id=61556364535348" target="_blank" rel="noopener"><i class="fab fa-facebook"></i> Facebook</a>
                        <a class="tiktok" href="https://www.tiktok.com/@walter.realtor2" target="_blank" rel="noopener"><i class="fab fa-tiktok"></i> TikTok</a>
                    </div>
                </div>
                <div class="footer-col">
                    <h4>Servicios</h4>
                    <ul>
                        <li><a href="/vender.html">Vender propiedad</a></li>
                        <li><a href="/comprar.html">Comprar inmueble</a></li>
                        <li><a href="/invertir.html">Inversión y Plusvalía</a></li>
                        <li><a href="/menajes.html">Relocación / Menaje</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Herramientas</h4>
                    <ul>
                        <li><a href="/propiedades.html">Ver inmuebles</a></li>
                        <li><a href="/costo-vida.html">Costo de Vida</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 Walter Guerrero - Agente Inmobiliario RE/MAX Elite. Todos los derechos reservados.</p>
            </div>
        </div>
    </footer>

    <a data-whatsapp data-wa="${esc(waMsg)}" href="${esc(waHref)}" class="floating-whatsapp" aria-label="Escribir por WhatsApp a Walter Guerrero"><i class="fab fa-whatsapp" aria-hidden="true"></i></a>

    <div class="lightbox-overlay" id="lightbox-overlay" onclick="if(event.target===this) cerrarLightbox()">
        <button class="lightbox-cerrar" onclick="cerrarLightbox()" aria-label="Cerrar"><i class="fas fa-times"></i></button>
        <button class="lightbox-compartir" onclick="compartirLightbox()"><i class="fas fa-share-nodes"></i> <span>Compartir</span></button>
        <button class="lightbox-prev" id="lightbox-prev" onclick="moverLightbox(-1)" aria-label="Foto anterior"><i class="fas fa-chevron-left"></i></button>
        <button class="lightbox-next" id="lightbox-next" onclick="moverLightbox(1)" aria-label="Foto siguiente"><i class="fas fa-chevron-right"></i></button>
        <img id="lightbox-img" src="" alt="">
        <div class="lightbox-contador" id="lightbox-contador"></div>
        <div class="lightbox-toast" id="lightbox-toast"></div>
    </div>

    <script src="/config.js?v=2"></script>
    <script src="/app.js?v=3"></script>
    <script>
        window.DOSSIER_DATA = ${JSON.stringify({
          id: p.id, slug, url,
          titulo: p.titulo, precio: precioLegible(p.precio, p.tipo_contrato),
          ubicacion: p.ubicacion || '',
          contrato,
          categoria: p.categoria || '',
          idExterno: p.id_externo || '',
          habitaciones: p.habitaciones || '', banos: p.banos || '',
          garage: !!p.garage, m2: areaFmt(p.m2),
          tamanoLote: areaFmt(p.tamano_lote), tamanoConstruccion: areaFmt(p.tamano_construccion),
          tipo: p.tipo_propiedad_detalle || '',
          nueva: !!p.propiedad_nueva, comunidadCerrada: !!p.comunidad_cerrada, hoa: !!p.hoa,
          fechaPublicacion: fmtFecha(p.fecha_publicacion) || null,
          descripcion,
          foto: foto0,
          fotos: fotos.slice(0, 5),
          agente: AGENTE,
          waNumber: WHATSAPP_NUMBER,
        }).replace(/</g, '\\u003c')};
    </script>
    <script>
        var FICHA_FOTOS = ${JSON.stringify(fotos)};
        var FICHA_SHARE = { titulo: ${JSON.stringify(p.titulo)}, url: ${JSON.stringify(url)} };
        var FICHA_ID = ${JSON.stringify(p.id)};
        var FICHA_IDX = 0;
        function verFoto(i) {
            FICHA_IDX = i;
            var hero = document.getElementById('ficha-hero');
            var f = FICHA_FOTOS[i] || FICHA_FOTOS[0];
            if (hero) hero.src = (window.imgOpt ? window.imgOpt(f, 1080, 75) : f);
            document.querySelectorAll('.ficha-thumb').forEach(function (t, idx) { t.classList.toggle('activo', idx === i); });
        }
        function abrirGaleria() {
            window.abrirLightbox(FICHA_FOTOS, FICHA_IDX, FICHA_SHARE);
        }
        // El video de YouTube se carga solo al hacer clic (más rápido y sin
        // cookies de terceros hasta que el visitante decide verlo).
        function cargarYt(el) {
            var id = el.getAttribute('data-yt');
            var f = document.createElement('iframe');
            f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
            f.title = 'Video de la propiedad';
            f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            f.allowFullscreen = true;
            el.replaceWith(f);
            try { if (typeof window.fbq === 'function') window.fbq('trackCustom', 'PlayPropertyVideo', { content_ids: [FICHA_ID], content_name: FICHA_SHARE.titulo }); } catch (e) {}
            if (window.CostoSVMetricas) window.CostoSVMetricas.registrarEvento('ficha_view', 'video: ' + FICHA_SHARE.titulo);
        }
    </script>
    <!-- El dossier se abrió 4 veces en 3.459 visitas (0,1%), pero sus 26 KB se
         bajaban en todas. Con defer deja de competir por el ancho de banda
         mientras se pinta la página. -->
    <script src="/dossier.js?v=1" defer></script>
</body>
</html>`;
}

export { render, youtubeId, buscarPropiedad };

export default async function handler(req, res) {
  const raw = (req.query && (req.query.slug || req.query.propiedad)) || '';
  const valor = String(Array.isArray(raw) ? raw[0] : raw).trim().toLowerCase();

  if (!valor) {
    res.setHeader('Location', '/propiedades.html');
    res.status(302).end();
    return;
  }

  let propiedad = null;
  try {
    propiedad = await buscarPropiedad(valor);
  } catch (err) {
    console.error('Error consultando la propiedad:', err);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!propiedad) {
    // Se buscan alternativas con lo que dice la propia dirección. Si la
    // consulta falla, la página se arma igual, solo que sin tarjetas: el
    // visitante nunca ve un error por esto.
    const pistas = pistasDelSlug(valor);
    let sugeridas = [];
    try {
      const publicadas = await traerPublicadas();
      if (publicadas.length) sugeridas = parecidas(publicadas, pistas, 3).items;
    } catch (err) {
      console.error('No se pudieron buscar propiedades parecidas:', err);
    }
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(404).send(paginaNoEncontrada(valor, sugeridas, pistas));
    return;
  }

  // Si entraron por id pero ya hay slug, mandamos a la URL canónica.
  const slugCanonico = propiedad.slug || propiedad.id;
  if (valor !== String(slugCanonico).toLowerCase()) {
    res.setHeader('Location', `/propiedad/${slugCanonico}`);
    res.status(301).end();
    return;
  }

  // La ficha recibe ~2.800 visitas al mes: una cada 15 minutos. Con los 120 s
  // que tenía antes, la caché del CDN caducaba siempre ANTES de la visita
  // siguiente, así que casi todo el mundo caía en un arranque en frío de la
  // función (1,8 s hasta el primer byte, medido; con caché caliente es 0,4 s).
  // Con una hora de validez la mayoría entra por caché, y
  // stale-while-revalidate de un día hace que, pasada esa hora, el visitante
  // reciba al instante la versión guardada mientras el CDN la renueva por
  // detrás: nadie espera por la revalidación.
  // Precio: un cambio hecho en el panel puede tardar hasta una hora en verse.
  // Si hace falta al instante, un redeploy limpia la caché.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(render(propiedad));
}
