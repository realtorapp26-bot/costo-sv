// ============================================================
//  Costo SV — build unificado para UN solo proyecto Vercel
//
//  El sitio público es HTML estático servido tal cual (siempre lo fue).
//  El panel nuevo (panel/) es una app Vite que sí necesita compilarse.
//  Vercel solo permite un Build Command / Output Directory por proyecto,
//  así que este script arma esa salida única:
//
//    dist_site/                 <- Output Directory en Vercel
//      index.html, *.html, styles.css, app.js, assets/, ...   (sitio, copiado tal cual)
//      panel/                                                  (build de panel/, Vite)
//
//  api/ NO se copia: Vercel detecta las funciones serverless directo desde la
//  carpeta /api del repo, sin importar el Output Directory.
//
//  Local: node build-static.mjs   (o "npm run build" si se agrega ese script)
//  Vercel: Build Command = "node build-static.mjs", Output Directory = "dist_site"
// ============================================================
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'dist_site');
const PANEL = join(ROOT, 'panel');

// Carpetas que nunca van al sitio estático (tooling, código fuente del panel,
// funciones serverless -las maneja Vercel aparte-, etc.)
const EXCLUIR = new Set([
  'node_modules', '.git', '.github', '.claude', '.vercel',
  'panel', 'api', 'supabase', 'dist_site',
]);

function log(msg) {
  console.log(`\n▶ ${msg}`);
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

log('Limpiando dist_site/ ...');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

log('Copiando el sitio público (archivos estáticos) ...');
for (const entry of readdirSync(ROOT)) {
  if (EXCLUIR.has(entry) || entry.startsWith('.')) continue;
  cpSync(join(ROOT, entry), join(OUT, entry), { recursive: true });
}

log('Instalando dependencias del panel ...');
run('npm install --no-audit --no-fund', PANEL);

log('Compilando el panel (Vite) ...');
run('npm run build', PANEL);

log('Copiando panel/dist -> dist_site/panel ...');
cpSync(join(PANEL, 'dist'), join(OUT, 'panel'), { recursive: true });

console.log('\n✅ dist_site/ listo — sitio público + /panel');
