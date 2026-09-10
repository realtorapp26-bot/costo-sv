import type { Estado, Interes, Origen } from './types';

export const ESTADOS: Estado[] = ['nuevo', 'contactado', 'calificado', 'perdido', 'cerrado'];
export const ORIGENES: Origen[] = ['whatsapp', 'formulario_web', 'marketplace', 'referido', 'otro'];
export const INTERESES: Interes[] = ['comprar', 'vender', 'invertir', 'otro'];

export const ORIGEN_LABEL: Record<Origen, string> = {
  whatsapp: 'WhatsApp',
  formulario_web: 'Sitio Web',
  marketplace: 'Marketplace',
  referido: 'Referido',
  otro: 'Otro',
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
