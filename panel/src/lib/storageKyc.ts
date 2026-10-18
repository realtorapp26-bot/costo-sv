import { supabase } from './supabase';

// Subida de documentos de identidad para KYC -- deliberadamente SEPARADO de
// storage.ts: ese módulo fuerza conversión HEIC->JPEG y recorte por canvas
// (rompe con un PDF) y usa getPublicUrl(), que no sirve para un bucket
// privado. Acá se sube el archivo tal cual y se devuelve la ruta dentro del
// bucket -- para verlo hace falta pedir un signed URL aparte.

const BUCKET_KYC = 'kyc-documentos';
const MAX_BYTES = 20 * 1024 * 1024;

export async function subirDocumentoKyc(file: File, casoId: string, lado: 'frontal' | 'reverso'): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('El archivo supera 20MB.');
  const nombreLimpio = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const ruta = `${casoId}/${lado}-${Date.now()}-${nombreLimpio}`;
  const { error } = await supabase.storage
    .from(BUCKET_KYC)
    .upload(ruta, file, { contentType: file.type || 'application/octet-stream' });
  if (error) throw error;
  return ruta;
}

export async function kycDocumentoSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_KYC).createSignedUrl(path, 120);
  if (error || !data) throw error ?? new Error('No se pudo generar el enlace');
  return data.signedUrl;
}
