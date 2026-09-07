// ============================================================
//  Costo SV — Descarga de todas las fotos de una propiedad en un ZIP
//  Ruta: /api/fotos-zip?slug=<slug>   (también acepta ?id=<uuid>)
//
//  Se hace en el servidor a propósito: así se descargan las fotos sin los
//  problemas de CORS que tendría el navegador con el CDN de origen (RE/MAX).
//  El ZIP se arma a mano con método STORE (sin compresión) — los JPG/PNG ya
//  vienen comprimidos, así que no vale la pena y evita meter una dependencia
//  (este repo no tiene package.json).
// ============================================================

import { buscarPropiedad } from './propiedad.js';

const MAX_FOTOS = 60;

// --- CRC32 (tabla) ---------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const year = Math.max(0, d.getFullYear() - 1980);
  const date = ((year & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

// files: [{ name: string, data: Buffer }]
function armarZip(files) {
  const { time, date } = dosDateTime(new Date());
  const partes = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const nombre = Buffer.from(f.name, 'utf8');
    const crc = crc32(f.data);
    const size = f.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // método STORE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nombre.length, 26);
    local.writeUInt16LE(0, 28);
    partes.push(local, nombre, f.data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(nombre.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nombre);

    offset += local.length + nombre.length + f.data.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...partes, centralBuf, eocd]);
}

function extensionDe(url, contentType) {
  const m = String(url).split('?')[0].match(/\.(jpe?g|png|webp|gif|avif)$/i);
  if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('avif')) return 'avif';
  return 'jpg';
}

export default async function handler(req, res) {
  const raw = (req.query && (req.query.slug || req.query.id || req.query.propiedad)) || '';
  const valor = String(Array.isArray(raw) ? raw[0] : raw).trim().toLowerCase();
  if (!valor) {
    res.status(400).json({ error: 'Falta el parámetro slug' });
    return;
  }

  let p = null;
  try {
    p = await buscarPropiedad(valor);
  } catch (err) {
    console.error('fotos-zip: error consultando la propiedad:', err);
  }

  if (!p || !Array.isArray(p.fotos) || !p.fotos.length) {
    res.status(404).json({ error: 'Propiedad no encontrada o sin fotos' });
    return;
  }

  const urls = [...new Set(p.fotos.filter((u) => /^https?:\/\//i.test(u)))].slice(0, MAX_FOTOS);
  const files = [];

  await Promise.all(urls.map(async (u, i) => {
    try {
      const r = await fetch(u);
      if (!r.ok) return;
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length) return;
      files.push({ idx: i, name: `foto-${String(i + 1).padStart(2, '0')}.${extensionDe(u, r.headers.get('content-type'))}`, data: buf });
    } catch (err) {
      console.error('fotos-zip: no se pudo bajar', u, err.message);
    }
  }));

  if (!files.length) {
    res.status(502).json({ error: 'No se pudo descargar ninguna foto' });
    return;
  }
  files.sort((a, b) => a.idx - b.idx);

  const zip = armarZip(files);
  const base = String(p.slug || p.id).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'propiedad';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${base}-fotos.zip"`);
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(zip);
}
