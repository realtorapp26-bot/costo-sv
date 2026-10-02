import { supabase } from './supabase';

// Port a TypeScript de la subida de fotos del panel clásico (login.js) --
// mismo bucket, mismo recorte/calidad y mismo cuidado de no saturar la
// memoria del celular subiendo varias fotos pesadas de corrido.

const BUCKET_FOTOS = 'fichas-fotos';
const MAX_LADO_FOTO = 2000; // px -- de sobra para verse nítida en la web, mucho más liviano que el original de cámara

// Redibuja la imagen en un canvas más chico. Esto es lo que evita que
// convertir/subir varias fotos pesadas seguidas sature la memoria del
// navegador en el celular.
async function reescalarBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const escala = Math.min(1, MAX_LADO_FOTO / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * escala));
  const h = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85);
  });
}

// Los iPhone guardan las fotos de la cámara como .heic por defecto -- casi
// ningún navegador las muestra en <img>. Se convierten a JPEG acá. Si la
// conversión falla, se lanza el error en vez de subir el .heic original:
// subirlo igual solo cambia un problema visible (el error) por uno
// invisible (la foto rota en el sitio).
async function prepararFoto(file: File): Promise<File> {
  const esHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  let blob: Blob = file;
  let nombre = file.name;
  let tipo = file.type || 'image/jpeg';

  if (esHeic) {
    const heic2any = (await import('heic2any')).default;
    const resultado = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    blob = Array.isArray(resultado) ? resultado[0] : resultado;
    nombre = file.name.replace(/\.hei[cf]$/i, '.jpg');
    tipo = 'image/jpeg';
  }

  try {
    blob = await reescalarBlob(blob);
    tipo = 'image/jpeg';
    nombre = nombre.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
  } catch (ex) {
    console.error('No se pudo reescalar la foto, se sube tal cual:', ex);
  }

  return new File([blob], nombre.replace(/[^a-zA-Z0-9.-]/g, '_'), { type: tipo });
}

export async function subirFoto(file: File): Promise<string> {
  const archivo = await prepararFoto(file);
  const ruta = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${archivo.name}`;
  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(ruta, archivo, { contentType: archivo.type || 'application/octet-stream' });
  if (error) throw error;
  return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl;
}

export interface ResultadoSubida {
  urls: string[];
  fallidas: string[];
}

// Sube uno o varios archivos en secuencia (con pausa entre cada uno --
// convertir/reescalar varias fotos pesadas de corrido puede saturar la
// memoria del navegador en el celular). onProgreso avisa "subiendo N de M".
export async function subirFotos(
  files: File[],
  onProgreso?: (actual: number, total: number) => void,
): Promise<ResultadoSubida> {
  const urls: string[] = [];
  const fallidas: string[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgreso?.(i + 1, files.length);
    try {
      urls.push(await subirFoto(files[i]));
    } catch (ex) {
      console.error(`No se pudo subir "${files[i].name}":`, ex);
      fallidas.push(files[i].name);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { urls, fallidas };
}
