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
const FOTO_RESPALDO = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const precioNumero = (p) => {
  const n = Number(String(p == null ? '' : p).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
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

function paginaNoEncontrada() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Propiedad no disponible | Walter Guerrero RE/MAX</title>
<link rel="stylesheet" href="/styles.css"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head><body><div class="container" style="text-align:center;padding:120px 20px;">
<h1 class="hero-title-sm">Esta propiedad ya no está disponible</h1>
<p class="section-subtitle">Puede que se haya vendido o retirado del inventario público.</p>
<a href="/propiedades.html" class="btn btn-gold" style="margin-top:20px;">Ver propiedades disponibles</a>
</div></body></html>`;
}

function render(p) {
  const slug = p.slug || p.id;
  const fotos = Array.isArray(p.fotos) && p.fotos.length ? p.fotos : [FOTO_RESPALDO];
  const foto0 = fotos[0];
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
    : recorte(`${p.titulo} en ${contrato.toLowerCase()}${p.ubicacion ? ' — ' + p.ubicacion : ''}. ${p.precio || ''}. Contactá a Walter Guerrero, RE/MAX El Salvador.`, 158);

  const chips = [
    p.habitaciones ? `<span><i class="fas fa-bed"></i> ${esc(p.habitaciones)} hab</span>` : '',
    p.banos ? `<span><i class="fas fa-bath"></i> ${esc(p.banos)} baños</span>` : '',
    p.m2 ? `<span><i class="fas fa-vector-square"></i> ${esc(p.m2)} m²</span>` : '',
    p.tamano_lote ? `<span><i class="fas fa-ruler-combined"></i> Lote ${esc(p.tamano_lote)}</span>` : '',
    p.tamano_construccion ? `<span><i class="fas fa-drafting-compass"></i> Construcción ${esc(p.tamano_construccion)}</span>` : '',
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
  const enlacesExtra = [
    tieneMapa ? `<a href="https://www.google.com/maps/search/?api=1&query=${p.latitud},${p.longitud}" target="_blank" rel="noopener"><i class="fas fa-map-location-dot"></i> Ver ubicación en el mapa</a>` : '',
    p.tour_virtual_url ? `<a href="${esc(p.tour_virtual_url)}" target="_blank" rel="noopener"><i class="fas fa-vr-cardboard"></i> Tour virtual 360°</a>` : '',
    (p.video_url && !ytId) ? `<a href="${esc(p.video_url)}" target="_blank" rel="noopener"><i class="fas fa-play-circle"></i> Video de la propiedad</a>` : '',
  ].filter(Boolean).join('');

  const waMsg = `Hola Walter, me interesa "${p.titulo}" (${p.precio || ''}) que vi en ${url}. ¿Me das más información?`;
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  const galeriaThumbs = fotos.length > 1
    ? `<div class="ficha-thumbs">${fotos.map((f, i) => `<button type="button" class="ficha-thumb${i === 0 ? ' activo' : ''}" onclick="verFoto(${i})"><img src="${esc(f)}" alt="${esc(p.titulo)} — foto ${i + 1}" loading="lazy" decoding="async"></button>`).join('')}</div>`
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
        ...(p.ubicacion ? { address: { '@type': 'PostalAddress', addressLocality: p.ubicacion, addressCountry: 'SV' } } : {}),
        ...(precioN ? { offers: { '@type': 'Offer', price: precioN, priceCurrency: 'USD', availability: 'https://schema.org/InStock', url, seller: { '@type': 'RealEstateAgent', name: 'Walter Guerrero — RE/MAX El Salvador' } } } : {}),
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
    <title>${esc(p.titulo)} — ${esc(p.precio || contrato)} | Walter Guerrero RE/MAX</title>
    <meta name="description" content="${esc(metaDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${esc(url)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Walter Guerrero · RE/MAX El Salvador">
    <meta property="og:locale" content="es_SV">
    <meta property="og:title" content="${esc(p.titulo)} — ${esc(p.precio || '')}">
    <meta property="og:description" content="${esc(metaDesc)}">
    <meta property="og:url" content="${esc(url)}">
    <meta property="og:image" content="${esc(foto0)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(p.titulo)} — ${esc(p.precio || '')}">
    <meta name="twitter:description" content="${esc(metaDesc)}">
    <meta name="twitter:image" content="${esc(foto0)}">
    <meta name="theme-color" content="#0f172a">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/favicon.svg">
    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap">
    <link rel="stylesheet" href="/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .ficha-wrap { max-width: 1180px; margin: 0 auto; padding: 40px 24px 80px; }
        .ficha-volver { display: inline-flex; align-items: center; gap: 8px; color: var(--text-light); text-decoration: none; font-size: 0.9rem; margin-bottom: 24px; }
        .ficha-volver:hover { color: var(--primary); }
        .ficha-hero-img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: var(--radius-md); cursor: zoom-in; background: var(--border); }
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
        .ficha-video { position: relative; aspect-ratio: 16 / 9; border-radius: var(--radius-md); overflow: hidden; background: #000; }
        .ficha-video iframe, .ficha-video .yt-facade { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .yt-facade { display: flex; align-items: center; justify-content: center; background-size: cover; background-position: center; cursor: pointer; padding: 0; }
        .yt-facade::after { content: ''; position: absolute; inset: 0; background: rgba(10, 15, 28, 0.28); transition: background 0.25s ease; }
        .yt-facade:hover::after { background: rgba(10, 15, 28, 0.12); }
        .yt-play { position: relative; z-index: 1; width: 66px; height: 66px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; padding-left: 4px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35); }
        @media (max-width: 880px) {
            .ficha-layout { flex-direction: column; }
            .ficha-aside { position: static; width: 100%; flex-basis: auto; }
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
            <button class="mobile-menu-btn"><i class="fas fa-bars"></i></button>
            <nav class="nav-links">
                <a href="/index.html">Inicio</a>
                <a href="/vender.html">Vender</a>
                <a href="/comprar.html">Comprar</a>
                <a href="/invertir.html">Invertir</a>
                <a href="/propiedades.html" class="active">Propiedades</a>
                <a href="/menajes.html">Menajes</a>
                <a href="/costo-vida.html">Costo de Vida</a>
                <a data-whatsapp href="#" class="btn btn-gold btn-whatsapp"><i class="fab fa-whatsapp"></i> Contactar</a>
            </nav>
        </div>
    </header>

    <div class="ficha-wrap">
        <a href="/propiedades.html#${esc(slug)}" class="ficha-volver"><i class="fas fa-arrow-left"></i> Volver al inventario</a>

        <img id="ficha-hero" class="ficha-hero-img" src="${esc(foto0)}" alt="${esc(p.titulo)}" onerror="this.src='${FOTO_RESPALDO}'" onclick="abrirGaleria()">
        ${galeriaThumbs}

        <div class="ficha-layout">
            <div class="ficha-main">
                <span class="ficha-badge">${esc(p.categoria || 'Propiedad')} · ${contrato}</span>
                <h1 class="ficha-titulo">${esc(p.titulo)}</h1>
                ${p.ubicacion ? `<p class="ficha-ubicacion"><i class="fas fa-location-dot"></i>${esc(p.ubicacion)}</p>` : ''}
                ${chips ? `<div class="ficha-chips">${chips}</div>` : ''}

                ${descripcion ? `<div class="ficha-seccion"><h2>Descripción</h2><div class="ficha-desc">${esc(descripcion)}</div></div>` : ''}
                ${videoHtml}
                ${featuresHtml ? `<div class="ficha-seccion"><h2>Características</h2>${featuresHtml}</div>` : ''}
                ${enlacesExtra ? `<div class="ficha-seccion"><h2>Más información</h2><div class="ficha-enlaces">${enlacesExtra}</div></div>` : ''}
            </div>

            <aside class="ficha-aside">
                <div class="ficha-precio-label">Precio</div>
                <div class="ficha-precio">${esc(p.precio || 'Consultar')}</div>
                <a data-whatsapp data-wa="${esc(waMsg)}" href="${esc(waHref)}" class="btn btn-whatsapp"><i class="fab fa-whatsapp"></i> Consultar por WhatsApp</a>
                <a href="/propiedades.html" class="btn btn-outline" style="margin-top:12px;">Ver otras propiedades</a>
                <p class="aside-nota">Atención directa de Walter Guerrero, agente RE/MAX El Salvador.</p>
            </aside>
        </div>
    </div>

    <footer>
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <h4>Walter Guerrero | RE/MAX</h4>
                    <p style="color: #cbd5e1; max-width: 300px;">Agente inmobiliario profesional dedicado a tu éxito financiero a través de bienes raíces en El Salvador.</p>
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
                <p>&copy; 2026 Walter Guerrero - Agente Inmobiliario RE/MAX El Salvador. Todos los derechos reservados.</p>
            </div>
        </div>
    </footer>

    <a data-whatsapp data-wa="${esc(waMsg)}" href="${esc(waHref)}" class="floating-whatsapp"><i class="fab fa-whatsapp"></i></a>

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
        var FICHA_FOTOS = ${JSON.stringify(fotos)};
        var FICHA_SHARE = { titulo: ${JSON.stringify(p.titulo)}, url: ${JSON.stringify(url)} };
        var FICHA_ID = ${JSON.stringify(p.id)};
        var FICHA_IDX = 0;
        function verFoto(i) {
            FICHA_IDX = i;
            var hero = document.getElementById('ficha-hero');
            if (hero) hero.src = FICHA_FOTOS[i] || FICHA_FOTOS[0];
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
</body>
</html>`;
}

export { render, youtubeId };

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
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(404).send(paginaNoEncontrada());
    return;
  }

  // Si entraron por id pero ya hay slug, mandamos a la URL canónica.
  const slugCanonico = propiedad.slug || propiedad.id;
  if (valor !== String(slugCanonico).toLowerCase()) {
    res.setHeader('Location', `/propiedad/${slugCanonico}`);
    res.status(301).end();
    return;
  }

  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.status(200).send(render(propiedad));
}
