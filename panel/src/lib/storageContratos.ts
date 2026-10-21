import { supabase } from './supabase';

// Firma del corredor (PNG) + PDF firmado final de un contrato de
// comercialización. Separado de storage.ts/storageKyc.ts por la misma razón
// que ese último: bucket privado, sin conversión de imagen, sin
// getPublicUrl() -- acá además el archivo es un blob generado desde un
// <canvas>, no un File elegido por el usuario.

const BUCKET_CONTRATOS = 'contratos-documentos';

export async function subirFirmaCorredor(blob: Blob, contratoId: string): Promise<string> {
  const ruta = `${contratoId}/firma-corredor.png`;
  const { error } = await supabase.storage
    .from(BUCKET_CONTRATOS)
    .upload(ruta, blob, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  return ruta;
}

export async function contratoDocumentoSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_CONTRATOS).createSignedUrl(path, 120);
  if (error || !data) throw error ?? new Error('No se pudo generar el enlace');
  return data.signedUrl;
}
