import type { Categoria, TipoContrato } from './types';
import type { PropiedadCampos } from './queries';

// Importación desde RE/MAX Connect -- reusa tal cual los mismos endpoints
// de servidor que ya usa el panel clásico (api/traer-html, api/extraer-datos,
// api/traer-seleccion), portando a TS la lógica de extracción que antes
// corría en panel.html.

// Algunos hosts (ej. fotos exportadas de WhatsApp) tienen espacios en el
// nombre de archivo -- no se puede excluir \s del patrón, solo saltos de
// línea y las comillas/ángulos que sí delimitan el atributo HTML.
const REGEX_FOTOS = /https?:\/\/[^\n\r"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\n\r"'<>]*)?/gi;
const EXCLUIR_FOTOS = /logo|favicon|icon|avatar|userfiles|\/photos\/[^/]*-min\.|agent|profile/i;

export function extraerFotosDeTexto(texto: string): string[] {
  const encontradas = texto.match(REGEX_FOTOS) || [];
  return [...new Set(encontradas)].filter((u) => !EXCLUIR_FOTOS.test(u));
}

function enElSalvador(lat: number, lng: number) {
  return lat >= 12.9 && lat <= 14.6 && lng >= -90.2 && lng <= -87.6;
}

const PATRONES_COORDENADAS = [
  /!3d(-?\d{1,2}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/,
  /[?&#](?:q|query|center|ll|sll|destination)=(-?\d{1,2}\.\d{3,})[,%2C ]+(-?\d{1,3}\.\d{3,})/i,
  /"(?:lat|latitude)"\s*:\s*"?(-?\d{1,2}\.\d{3,})"?\s*,\s*"(?:lng|lon|long|longitude)"\s*:\s*"?(-?\d{1,3}\.\d{3,})"?/i,
  /LatLng\(\s*(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})\s*\)/,
  /data-lat(?:itude)?=["'](-?\d{1,2}\.\d{3,})["'][^>]*data-l(?:ng|on|ongitude)=["'](-?\d{1,3}\.\d{3,})["']/i,
];

export function extraerCoordenadasDeTexto(texto: string): { lat: number; lng: number } | null {
  for (const re of PATRONES_COORDENADAS) {
    const m = texto.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (enElSalvador(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

export function extraerFechaPubDeTexto(texto: string): string | null {
  const iso = texto.match(/"date(?:Posted|Published|Modified)"\s*:\s*"(\d{4}-\d{2}-\d{2})/i);
  if (iso) return iso[1];
  const m = texto.match(/Publicad[oa]\s*:?\s*([a-záéíóú]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const mes = MESES[m[1].toLowerCase()];
    if (mes) return `${m[3]}-${mes}-${String(m[2]).padStart(2, '0')}`;
  }
  return null;
}

export function extraerLinkDeTexto(texto: string): string | null {
  const linkTags = texto.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    if (/rel=["']canonical["']/i.test(tag)) {
      const href = tag.match(/href=["']([^"']+)["']/i);
      if (href) return href[1];
    }
  }
  const metaTags = texto.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    if (/property=["']og:url["']/i.test(tag)) {
      const content = tag.match(/content=["']([^"']+)["']/i);
      if (content) return content[1];
    }
  }
  return null;
}

export async function traerHtml(url: string): Promise<string> {
  const res = await fetch('/api/traer-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo traer el listado');
  return data.html;
}

export interface DatosExtraidos {
  titulo?: string;
  precio?: string;
  ubicacion?: string;
  categoria?: Categoria;
  habitaciones?: string | null;
  banos?: string | null;
  m2?: string | null;
  descripcion?: string;
  tipo_contrato?: TipoContrato;
  tipo_propiedad_detalle?: string | null;
  id_externo?: string | null;
  tamano_lote?: string | null;
  tamano_construccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  tour_virtual_url?: string | null;
  video_url?: string | null;
  fecha_publicacion?: string | null;
  garage?: boolean;
  hoa?: boolean;
  comunidad_cerrada?: boolean;
  propiedad_nueva?: boolean;
  copy_venta?: string;
}

export async function extraerDatosConIA(texto: string): Promise<DatosExtraidos> {
  const res = await fetch('/api/extraer-datos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo extraer los datos');
  return data.datos || {};
}

// Arma el borrador completo para precargar el formulario de propiedad: el
// texto completo (HTML crudo del listado) se procesa con los regex locales
// (fotos/coordenadas/fecha/link -- la IA solo ve los primeros 8000
// caracteres y esos datos suelen ir más abajo), combinado con lo que
// devuelve la IA para el resto de los campos.
export async function armarBorradorDesdeTexto(texto: string): Promise<Partial<PropiedadCampos>> {
  const fotos = extraerFotosDeTexto(texto);
  const coords = extraerCoordenadasDeTexto(texto);
  const fechaPublicacion = extraerFechaPubDeTexto(texto);
  const linkReferencia = extraerLinkDeTexto(texto);
  const datos = await extraerDatosConIA(texto);

  return {
    titulo: datos.titulo,
    precio: datos.precio,
    ubicacion: datos.ubicacion,
    categoria: datos.categoria,
    tipo_contrato: datos.tipo_contrato,
    tipo_propiedad_detalle: datos.tipo_propiedad_detalle ?? null,
    habitaciones: datos.habitaciones ?? null,
    banos: datos.banos ?? null,
    m2: datos.m2 ?? null,
    tamano_lote: datos.tamano_lote ?? null,
    tamano_construccion: datos.tamano_construccion ?? null,
    latitud: datos.latitud ?? coords?.lat ?? null,
    longitud: datos.longitud ?? coords?.lng ?? null,
    garage: !!datos.garage,
    hoa: !!datos.hoa,
    comunidad_cerrada: !!datos.comunidad_cerrada,
    propiedad_nueva: !!datos.propiedad_nueva,
    fotos,
    tour_virtual_url: datos.tour_virtual_url ?? null,
    video_url: datos.video_url ?? null,
    descripcion_original: datos.descripcion ?? null,
    copy_venta: datos.copy_venta ?? null,
    link_referencia: linkReferencia,
    id_externo: datos.id_externo ?? null,
    fecha_publicacion: datos.fecha_publicacion ?? fechaPublicacion,
  };
}

export interface PropiedadImportada {
  link_referencia: string | null;
  titulo: string;
  precio: string | null;
  ubicacion: string | null;
  categoria: Categoria;
  habitaciones: string | null;
  banos: string | null;
  fotos?: string[];
  foto?: string;
  descripcion_original: string | null;
  copy_venta: string | null;
  latitud: number | null;
  longitud: number | null;
  tamano_lote: string | null;
  tamano_construccion: string | null;
  tipo_contrato: TipoContrato;
  tipo_propiedad_detalle: string | null;
  id_externo: string;
}

export async function traerSeleccion(url: string): Promise<PropiedadImportada[]> {
  const res = await fetch('/api/traer-seleccion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo traer la selección');
  return data.propiedades || [];
}
