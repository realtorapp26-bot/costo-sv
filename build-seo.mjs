// ============================================================
//  Costo SV — Inyector de SEO (OG/Twitter/canonical/favicon/JSON-LD)
//  Idempotente. El dominio sale de SITE_URL en config.js (fuente única):
//  se arma el bloque con %%SITE_URL%% y se resuelve al insertarlo.
//  SOLO datos verificados. Excluye 404.html.
//  Correr:  node build-seo.mjs
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';

const SITE = (readFileSync(new URL('./config.js', import.meta.url), 'utf8')
  .match(/SITE_URL:\s*['"]([^'"]*)['"]/) || [])[1]?.trim() || '';
if (!SITE) {
  console.error('❌ SITE_URL está vacío en config.js — definí el dominio antes de generar el SEO.');
  process.exit(1);
}

const BIZ = {
  name: 'Walter Guerrero',
  jobTitle: 'Agente Inmobiliario',
  affiliation: 'RE/MAX Elite',
  areaServed: 'El Salvador',
  telephone: '+503 7038-1941',
  email: 'walter.guerrero@remax.com.sv',
  siteName: 'Walter Guerrero · RE/MAX Elite',
  ogImage: '%%SITE_URL%%/assets/walter-guerrero-retocada.png',
  sameAs: ['https://www.youtube.com/@WalterGuerreroSV'],
};

// file -> etiqueta corta para el breadcrumb (index no lleva breadcrumb)
const PAGES = {
  'index.html': null,
  'vender.html': 'Vender',
  'comprar.html': 'Comprar',
  'invertir.html': 'Invertir',
  'propiedades.html': 'Propiedades',
  'centro-historico.html': 'Centro Histórico',
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
      areaServed: BIZ.areaServed, sameAs: BIZ.sameAs,
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
    <meta name="robots" content="index, follow">
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
  const seo = bloque(file, title, desc, label).replaceAll('%%SITE_URL%%', SITE);
  html = html.replace(/(<meta name="description"[^>]*>\n)/, `$1${seo}\n`);
  writeFileSync(new URL('./' + file, import.meta.url), html);
  hechos++;
}
console.log(`✅ SEO inyectado en ${hechos} páginas (404.html excluido a propósito).`);
