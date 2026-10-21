// ============================================================
//  Costo SV — Leer un contrato de comercialización para la página pública
//  de firma (contrato-firma.html), usando service_role (sin pasar por RLS,
//  que solo deja leer a `authenticated`). El documento que se devuelve es
//  exactamente lo que el vendedor tiene que leer antes de firmar -- nada
//  de esto es sensible para la persona que ya tiene el link.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const BUCKET = 'contratos-documentos';

async function firmaCorredorBase64(path, serviceKey) {
  if (!path) return null;
  const res = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('base64');
}

// Devuelve los campos del trato + la firma del corredor en base64 + estado.
export async function obtenerContrato(contratoId, serviceKey) {
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  if (!contratoId) throw new Error('Falta el identificador del contrato');

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const res = await fetch(`${SUPA_URL}/rest/v1/contratos_comercializacion?id=eq.${contratoId}&select=*`, { headers });
  if (!res.ok) throw new Error('No se pudo leer el contrato: ' + (await res.text()));
  const filas = await res.json();
  if (!filas.length) throw new Error('No se encontró el contrato indicado.');
  const c = filas[0];

  const corredor_firma_base64 = await firmaCorredorBase64(c.corredor_firma_path, serviceKey);

  return {
    id: c.id,
    numero: c.numero,
    estado: c.estado,
    completado_at: c.completado_at,
    fecha_acuerdo: c.fecha_acuerdo,
    vendedor_nombre: c.vendedor_nombre,
    corredor_nombre: c.corredor_nombre,
    propiedad_descripcion: c.propiedad_descripcion,
    propiedad_registro: c.propiedad_registro,
    propiedad_direccion: c.propiedad_direccion,
    propiedad_gravamenes: c.propiedad_gravamenes,
    propiedad_certificado: c.propiedad_certificado,
    precio_lista: c.precio_lista,
    tipo_listado: c.tipo_listado,
    comision_porcentaje: c.comision_porcentaje,
    comision_incluye_iva: c.comision_incluye_iva,
    plazo_meses: c.plazo_meses,
    plazo_inicio: c.plazo_inicio,
    plazo_fin: c.plazo_fin,
    periodo_proteccion_dias: c.periodo_proteccion_dias,
    inventario: c.inventario || [],
    notas: c.notas,
    corredor_firma_base64,
    vendedor_firma_nombre: c.vendedor_firma_nombre,
    vendedor_firma_fecha: c.vendedor_firma_fecha,
  };
}
