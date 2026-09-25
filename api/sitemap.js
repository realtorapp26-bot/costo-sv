// ============================================================
//  Costo SV — sitemap.xml dinámico
//  Ruta: /sitemap.xml -> vercel.json reescribe a /api/sitemap
//
//  El sitemap anterior era un archivo estático con solo las páginas fijas:
//  cada ficha de propiedad (/propiedad/<slug>) nunca quedaba listada, así
//  que Google dependía de encontrarlas siguiendo links armados por
//  JavaScript en propiedades.html — más lento y menos confiable que tenerlas
//  acá. Credenciales: las mismas "publishable" de api/propiedad.js, públicas
//  por diseño, solo leen lo publicado.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const SUPA_KEY = 'sb_publishable_EWNNEWfk4DjuIGwkrbtx4g_PFMtzhSv';
const SITE_URL = 'https://guerrero-properties.com';

// file -> priority (mismo criterio que tenía el sitemap.xml estático)
const PAGINAS_FIJAS = {
  'index.html': 1.0,
  'vender.html': 0.8,
  'comprar.html': 0.8,
  'invertir.html': 0.8,
  'propiedades.html': 0.8,
  'golden-lake.html': 0.9,
  'menajes.html': 0.7,
  'costo-vida.html': 0.9,
  'sobre-mi.html': 0.6,
  'contacto.html': 0.7,
  'centro-historico.html': 0.5,
};

async function propiedadesPublicadas() {
  const url = `${SUPA_URL}/rest/v1/propiedades?select=slug,id,updated_at&publicada=eq.true&order=updated_at.desc`;
  const res = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
  if (!res.ok) return [];
  return res.json();
}

function urlEntry(loc, priority, lastmod) {
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${priority}</priority></url>`;
}

export default async function handler(req, res) {
  const entradas = Object.entries(PAGINAS_FIJAS).map(([file, priority]) =>
    urlEntry(`${SITE_URL}/${file}`, priority.toFixed(1)),
  );

  try {
    const propiedades = await propiedadesPublicadas();
    for (const p of propiedades) {
      const slug = p.slug || p.id;
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : null;
      entradas.push(urlEntry(`${SITE_URL}/propiedad/${slug}`, '0.85', lastmod));
    }
  } catch (err) {
    console.error('sitemap: no se pudieron cargar propiedades', err);
    // Sigue igual con solo las páginas fijas — mejor un sitemap parcial que un 500.
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(xml);
}
