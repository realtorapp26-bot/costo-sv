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

// 3) formato.js (navegador) y lib/formato.js (servidor) tienen la MISMA lógica
//    duplicada: formato.js se carga como script clásico y no puede importar
//    módulos, y lib/ no se publica al sitio. Acá se compara la salida de las
//    dos contra valores reales de la base, para que no se separen sin que
//    nadie se dé cuenta.
const MUESTRAS_PRECIO = [
  ['$950.000.00', 'venta'], ['$125000', 'venta'], ['$576,000.00', 'venta'],
  ['$890', 'alquiler'], ['$2,600.00', 'alquiler'], ['$2,700,000.00', 'venta'],
  ['$85,000.00', 'venta'], ['$100,600', 'venta'], ['', 'venta'], ['A consultar', 'venta'],
];
const MUESTRAS_AREA = [
  '1119.90', '460.63 m²', '96 manzanas', '345.77 m² (495 v²)', '2495',
  '500 Vr2', '928.7 Vr2', '14000 m²', '2,568.00 m²', '245-380 m²', '',
];
try {
  const mod = await import('./lib/formato.js');
  const navSrc = readFileSync(new URL('./formato.js', import.meta.url), 'utf8');
  const sandbox = { window: {} };
  // eslint-disable-next-line no-new-func
  new Function('window', navSrc)(sandbox.window);
  if (typeof sandbox.window.precioFmt !== 'function' || typeof sandbox.window.areaFmt !== 'function') {
    throw new Error('formato.js ya no define window.precioFmt / window.areaFmt');
  }
  for (const [valor, contrato] of MUESTRAS_PRECIO) {
    const a = sandbox.window.precioFmt(valor, contrato);
    const b = mod.precioFmt(valor, contrato);
    if (a !== b) errores.push(`formato de precio desincronizado para ${JSON.stringify(valor)} (${contrato}): formato.js da "${a}" y lib/formato.js da "${b}".`);
  }
  for (const valor of MUESTRAS_AREA) {
    const a = sandbox.window.areaFmt(valor);
    const b = mod.areaFmt(valor);
    if (a !== b) errores.push(`formato de área desincronizado para ${JSON.stringify(valor)}: formato.js da "${a}" y lib/formato.js da "${b}".`);
  }
} catch (e) {
  errores.push('No se pudo comparar formato.js con lib/formato.js: ' + e.message);
}

// Resultado
if (errores.length) {
  console.error('\n❌ PRE-DEPLOY BLOQUEADO — no publicar:\n' + errores.map(e => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}
console.log(`\n✅ Pre-deploy OK. SITE_URL = ${siteUrl}\n`);
