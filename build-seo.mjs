// ============================================================
//  Costo SV — Inyector de SEO (OG/Twitter/canonical/favicon/JSON-LD)
//  Idempotente. Usa %%SITE_URL%% (lo bloquea predeploy-check.mjs).
//  SOLO datos verificados. Excluye admin.html y 404.html.
//  Correr:  node build-seo.mjs
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';

const BIZ = {
  name: 'Walter Guerrero',
  jobTitle: 'Agente Inmobiliario',
  affiliation: 'RE/MAX El Salvador',
  areaServed: 'El Salvador',
  telephone: '+503 7038-4194',
  email: 'walter.guerrero@remax.com.sv',
  siteName: 'Walter Guerrero · RE/MAX El Salvador',
  ogImage: '%%SITE_URL%%/assets/walter-guerrero-retocada.png',
};

// file -> etiqueta corta para el breadcrumb (index no lleva breadcrumb)
const PAGES = {
  'index.html': null,
  'vender.html': 'Vender',
  'comprar.html': 'Comprar',
  'invertir.html': 'Invertir',
  'propiedades.html': 'Propiedades',
  'menajes.html': 'Menajes',
  'costo-vida.html': 'Costo de Vida',
  'sobre-mi.html': 'Sobre mí',
  'contacto.html': 'Contacto',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const rx = (t) => (t.match(/<title>([^<]*)<\/title>/) || [])[1]?.trim() || '';
const rd = (t) => (t.match(/<meta name="description" content="([^"]*)"/) || [])[1]?.trim() || '';

function jsonld(file, title, desc, label) {
  const graph = [
    { '@type': 'WebSite', '@id': '%%SITE_URL%%/#website', url: '%%SITE_URL%%/',
      name: BIZ.siteName, inLanguage: 'es', publisher: { '@id': '%%SITE_URL%%/#agent' } },
    { '@type': 'RealEstateAgent', '@id': '%%SITE_URL%%/#agent',
      name: `${BIZ.name} — ${BIZ.affiliation}`, url: '%%SITE_URL%%/',
      image: BIZ.ogImage, telephone: BIZ.telephone, email: BIZ.email,
      areaServed: BIZ.areaServed,
      employee: { '@type': 'Person', name: BIZ.name, jobTitle: BIZ.jobTitle, worksFor: BIZ.affiliation } },
  ];
  if (label) {
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: '%%SITE_URL%%/index.html' },
      { '@type': 'ListItem', position: 2, name: label, item: `%%SITE_URL%%/${file}` },
    ]});
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

function bloque(file, title, desc, label) {
  const t = esc(title), d = esc(desc);
  return `    <!-- SEO-META:START (generado por build-seo.mjs — no editar a mano) -->
    <link rel="canonical" href="%%SITE_URL%%/${file}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(BIZ.siteName)}">
    <meta property="og:locale" content="es_SV">
    <meta property="og:title" content="${t}">
    <meta property="og:description" content="${d}">
    <meta property="og:url" content="%%SITE_URL%%/${file}">
    <meta property="og:image" content="${BIZ.ogImage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t}">
    <meta name="twitter:description" content="${d}">
    <meta name="twitter:image" content="${BIZ.ogImage}">
    <meta name="theme-color" content="#0f172a">
    <link rel="icon" href="favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="favicon.svg">
    <script type="application/ld+json">${jsonld(file, title, desc, label)}</script>
    <!-- SEO-META:END -->`;
}

let hechos = 0;
for (const [file, label] of Object.entries(PAGES)) {
  let html = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
  const title = rx(html), desc = rd(html);
  if (!title || !desc) { console.warn(`⚠️  ${file}: falta title o description, se omite`); continue; }
  // idempotencia: quitar bloque previo si existe
  html = html.replace(/[ \t]*<!-- SEO-META:START[\s\S]*?<!-- SEO-META:END -->\n?/, '');
  // insertar justo después de la línea de <meta name="description" ...>
  html = html.replace(/(<meta name="description"[^>]*>\n)/, `$1${bloque(file, title, desc, label)}\n`);
  writeFileSync(new URL('./' + file, import.meta.url), html);
  hechos++;
}
console.log(`✅ SEO inyectado en ${hechos} páginas (admin.html y 404.html excluidos a propósito).`);
