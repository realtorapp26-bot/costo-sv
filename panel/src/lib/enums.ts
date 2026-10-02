import type { Categoria, Estado, Interes, Origen, TipoContrato } from './types';

export const ESTADOS: Estado[] = ['nuevo', 'contactado', 'calificado', 'perdido', 'cerrado'];
export const ORIGENES: Origen[] = ['whatsapp', 'formulario_web', 'facebook_ads', 'marketplace', 'referido', 'otro'];
export const INTERESES: Interes[] = ['comprar', 'vender', 'invertir', 'otro'];

export const ORIGEN_LABEL: Record<Origen, string> = {
  whatsapp: 'WhatsApp',
  formulario_web: 'Sitio Web',
  facebook_ads: 'Facebook Ads',
  marketplace: 'Marketplace',
  referido: 'Referido',
  otro: 'Otro',
};

// Para identificar el origen de un vistazo (lista y tarjetas de leads).
export const ORIGEN_ICONO: Record<Origen, string> = {
  whatsapp: 'fab fa-whatsapp',
  formulario_web: 'fas fa-globe',
  facebook_ads: 'fab fa-facebook',
  marketplace: 'fas fa-store',
  referido: 'fas fa-people-arrows',
  otro: 'fas fa-circle-question',
};

export const ESTADO_LABEL: Record<Estado, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  calificado: 'Calificado',
  perdido: 'Perdido',
  cerrado: 'Cerrado',
};

export const INTERES_LABEL: Record<Interes, string> = {
  comprar: 'Comprar',
  vender: 'Vender',
  invertir: 'Invertir',
  otro: 'Otro',
};

// Clases Tailwind por estado (chip / columna del pipeline).
export const ESTADO_CLASE: Record<Estado, string> = {
  nuevo: 'bg-blue-100 text-blue-800',
  contactado: 'bg-amber-100 text-amber-800',
  calificado: 'bg-emerald-100 text-emerald-800',
  perdido: 'bg-slate-200 text-slate-600',
  cerrado: 'bg-violet-100 text-violet-800',
};

export const CATEGORIAS: Categoria[] = [
  'Vivienda Residencial',
  'RE/MAX Exclusive (Lujo)',
  'Comercial / Industrial',
  'Proyectos y Desarrollos',
];

export const CATEGORIA_ICONO: Record<Categoria, string> = {
  'Vivienda Residencial': 'fas fa-house',
  'RE/MAX Exclusive (Lujo)': 'fas fa-gem',
  'Comercial / Industrial': 'fas fa-building',
  'Proyectos y Desarrollos': 'fas fa-city',
};

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
};

export const PUBLICADA_CLASE: Record<'si' | 'no', string> = {
  si: 'bg-emerald-100 text-emerald-700',
  no: 'bg-slate-200 text-slate-600',
};
