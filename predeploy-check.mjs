// ============================================================
//  Costo SV — Validación PRE-DESPLIEGUE
//  Falla (exit 1) si el dominio sigue pendiente o si quedan marcadores
//  sin resolver. Correr antes de publicar:  node predeploy-check.mjs
// ============================================================
import { readFileSync, readdirSync } from 'node:fs';

const errores = [];
const root = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// 1) SITE_URL debe estar definido en config.js
let siteUrl = '';
try {
  const cfg = readFileSync(new URL('./config.js', import.meta.url), 'utf8');
  const m = cfg.match(/SITE_URL:\s*['"]([^'"]*)['"]/);
  siteUrl = m ? m[1].trim() : '';
} catch { errores.push('No se pudo leer config.js'); }

if (!siteUrl) {
  errores.push('SITE_URL está PENDIENTE (vacío) en config.js — definí el dominio final antes de desplegar.');
}

// 2) Ningún archivo publicable debe conservar marcadores sin resolver
const marcadores = ['%%SITE_URL%%', 'DOMINIO-PENDIENTE'];
const archivos = readdirSync(new URL('.', import.meta.url))
  .filter(f => /\.(html|xml|txt|json|webmanifest)$/.test(f));
for (const f of archivos) {
  const txt = readFileSync(new URL('./' + f, import.meta.url), 'utf8');
  for (const marca of marcadores) {
    if (txt.includes(marca)) errores.push(`${f}: contiene el marcador sin resolver "${marca}".`);
  }
}

// Resultado
if (errores.length) {
  console.error('\n❌ PRE-DEPLOY BLOQUEADO — no publicar:\n' + errores.map(e => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}
console.log(`\n✅ Pre-deploy OK. SITE_URL = ${siteUrl}\n`);
